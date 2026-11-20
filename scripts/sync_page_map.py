#!/usr/bin/env python3
"""Capture the running prototype in clean Chrome contexts and publish a static snapshot."""

import argparse
import asyncio
from contextlib import contextmanager
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import tempfile
from threading import Thread

from page_map_scenes import GROUPS

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'page-map'
MANIFEST = OUTPUT / 'snapshot.json'
SIZE = dict(width=852, height=393)


@contextmanager
def serve():
    class Handler(SimpleHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=ROOT, **kwargs)

        def log_message(self, *args):
            pass

    class CaptureServer(ThreadingHTTPServer):
        request_queue_size = 128

    with CaptureServer(('127.0.0.1', 0), Handler) as server:
        Thread(target=server.serve_forever, daemon=True).start()
        try:
            yield f'http://127.0.0.1:{server.server_port}/'
        finally:
            server.shutdown()


async def capture(browser, url, group_id, scene, pending, slots):
    async with slots:
        context = await browser.new_context(viewport=SIZE, reduced_motion='reduce', timezone_id='Asia/Manila')
        try:
            for step in scene['steps']:
                if isinstance(step, tuple) and step[0] == 'storage':
                    await context.add_init_script(
                        f'localStorage.setItem({json.dumps(step[1])}, {json.dumps(step[2])})'
                    )
            page = await context.new_page()
            page.set_default_timeout(10000)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(url + '#' + scene['route'], wait_until='load')
            await page.add_style_tag(content='.switcher { visibility: hidden !important }')
            for step in scene['steps']:
                if isinstance(step, str):
                    await page.locator(step).first.click()
                    continue
                action, selector, *args = step
                if action == 'storage':
                    continue
                if action == 'route':
                    await page.evaluate('route => { location.hash = route; }', selector)
                    await page.wait_for_url(lambda value: value.endswith('#' + selector))
                    continue
                element = page.locator(selector).first
                if action == 'visible':
                    await element.wait_for(state='visible')
                elif action == 'file':
                    await element.set_input_files(ROOT / 'assets/game1-clean.png')
                elif action == 'input':
                    # Set sample values without opening the prototype's custom keyboard.
                    await element.evaluate("""(input, value) => {
                      input.value = value;
                      input.dispatchEvent(new Event('input', {bubbles: true}));
                    }""", args[0])
                elif action == 'select':
                    await element.evaluate("""(select, index) => {
                      select.selectedIndex = index;
                      select.dispatchEvent(new Event('change', {bubbles: true}));
                    }""", args[0])
                else:
                    raise ValueError(f'Unknown action: {action}')
            await page.locator(scene['ready']).first.wait_for(state='visible')
            await page.evaluate('''async () => {
              await document.fonts.ready;
              const visible = [...document.images].filter(img => img.getClientRects().length);
              for (const img of visible) {
                try {
                  await img.decode();
                } catch {
                  if (img.isConnected && img.getClientRects().length && !img.naturalWidth) {
                    throw new Error('Cannot load image: ' + img.src);
                  }
                }
              }
            }''')
            if errors:
                raise RuntimeError('; '.join(errors))
            data = await page.screenshot(type='jpeg', quality=87, animations='disabled', caret='initial')
            digest = hashlib.sha256(data).hexdigest()[:16]
            image = f'images/{group_id}/{scene["id"]}-{digest}.jpg'
            target = pending / image
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            return dict(id=scene['id'], title=scene['title'], image=image)
        except Exception as error:
            raise RuntimeError(f'{group_id}/{scene["id"]} ({scene["route"]}): {error}') from error
        finally:
            await context.close()


async def sync(url, chrome, selected, pending):
    from playwright.async_api import async_playwright

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            executable_path=chrome, channel=None if chrome else 'chrome'
        )
        slots = asyncio.Semaphore(4)
        try:
            results = await asyncio.gather(*[
                capture(browser, url, group['id'], scene, pending, slots)
                for group in selected for scene in group['screens']
            ], return_exceptions=True)
        finally:
            await browser.close()
    failures = [str(result) for result in results if isinstance(result, BaseException)]
    if failures:
        raise RuntimeError('\n'.join(failures))
    entries = iter(results)
    return {
        group['id']: dict(id=group['id'], name=group['name'],
                          screens=[next(entries) for _ in group['screens']])
        for group in selected
    }


def images(groups):
    return {screen['image'] for group in groups for screen in group['screens']}


def publish(groups, previous, pending):
    for source in pending.glob('images/*/*.jpg'):
        destination = OUTPUT / source.relative_to(pending)
        destination.parent.mkdir(parents=True, exist_ok=True)
        os.replace(source, destination)
    snapshot = pending / 'snapshot.json'
    snapshot.write_text(json.dumps({'groups': groups}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(snapshot, MANIFEST)
    for image in images(previous) - images(groups):
        target = OUTPUT / image
        target.unlink(missing_ok=True)
        if not any(target.parent.iterdir()):
            target.parent.rmdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--module', help='One module ID or displayed module name')
    parser.add_argument('--list', action='store_true', help='Show module IDs and names')
    parser.add_argument('--chrome', help='Optional path to a Chrome or Chromium executable')
    args = parser.parse_args()
    if args.list:
        for group in GROUPS:
            print(f'{group["id"]}: {group["name"]} ({len(group["screens"])})')
        return

    previous = json.loads(MANIFEST.read_text(encoding='utf-8'))['groups'] if MANIFEST.exists() else []
    selected = GROUPS
    if args.module:
        matches = {
            group['id'] for group in [*GROUPS, *previous]
            if args.module.casefold() in (group['id'].casefold(), group['name'].casefold())
        }
        if len(matches) != 1:
            parser.error('Specify one known module ID or name. See --list.')
        selected_id = matches.pop()
        selected = [group for group in GROUPS if group['id'] == selected_id]

    # Staging inside OUTPUT lets the final manifest replace the old one atomically.
    with tempfile.TemporaryDirectory(dir=OUTPUT, prefix='.capture-') as temp:
        pending = Path(temp)
        if selected:
            with serve() as url:
                captured = asyncio.run(sync(url, args.chrome, selected, pending))
        else:
            captured = {}
        if args.module:
            kept = {group['id']: group for group in previous if group['id'] != selected_id}
            kept.update(captured)
            order = dict.fromkeys(group['id'] for group in [*GROUPS, *previous])
            groups = [kept[key] for key in order if key in kept]
        else:
            groups = list(captured.values())
        publish(groups, previous, pending)
    print(f'Synced {sum(len(group["screens"]) for group in captured.values())} screenshots. '
          f'Map contains {len(images(groups))} screenshots in {len(groups)} modules.')


if __name__ == '__main__':
    main()
