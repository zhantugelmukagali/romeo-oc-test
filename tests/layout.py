"""Verify the redesigned workspace, embedded font and layouts at device sizes."""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('ROMEO_TEST_URL', 'http://127.0.0.1:5173')
OUT = Path(os.environ.get('ROMEO_LAYOUT_ARTIFACTS', '/tmp/romeo-redesign-final'))
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    errors = []
    for width in [360, 390, 768, 1024, 1440]:
        page = browser.new_page(viewport={'width': width, 'height': 960 if width > 800 else 844}, reduced_motion='reduce')
        page.on('pageerror', lambda error: errors.append(str(error)))
        for route in ['overview', 'finance', 'finance?tab=cash', 'finance?tab=requests', 'stores', 'tasks', 'assistant', 'settings']:
            page.goto(URL + '/#/' + route, wait_until='networkidle')
            page.evaluate('document.fonts.ready')
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), f'{route} overflows at {width}'
            assert page.locator('body').evaluate('el => getComputedStyle(document.documentElement).backgroundColor') == 'rgb(255, 255, 255)'
            expect(page.locator('.demo-ribbon, .quick-start, .main-footer, .overview-side')).to_have_count(0)
            assert not re.search(r'демо|демонстра|вымышлен', page.locator('main').inner_text(), re.I), f'Repeated demo copy on {route}'
            assert page.evaluate('document.fonts.check(\'500 14px "Montserrat Variable"\', "Финансы 123")'), 'Montserrat not loaded'
            other_fonts = page.locator('h1, h2, button, input, select, textarea, .recharts-text').evaluate_all('''els => els.filter(el => el.getBoundingClientRect().width > 0 && !getComputedStyle(el).fontFamily.includes('Montserrat')).map(el => el.tagName + ': ' + getComputedStyle(el).fontFamily)''')
            assert not other_fonts, (route, width, other_fonts)
            clipped_buttons = page.locator('main button').evaluate_all('''els => els.filter(el => el.getBoundingClientRect().width > 0 && el.scrollWidth > el.clientWidth + 2).map(el => el.textContent)''')
            assert not clipped_buttons, (route, width, clipped_buttons)
            if width in [390, 1440]:
                name = route.replace('?tab=', '-')
                page.screenshot(path=str(OUT / f'{name}-{width}.png'), full_page=True)
        print(f'PASS: all screens fit {width}px; Montserrat on text, controls and charts; buttons fit', flush=True)
        page.close()

    page = browser.new_page(viewport={'width': 1440, 'height': 960}, reduced_motion='reduce')
    page.goto(URL, wait_until='networkidle')
    expect(page.locator('.overview-metrics .metric')).to_have_count(3)
    row = page.locator('.decision-row').first
    title = row.locator('strong').inner_text()
    row.click()
    expect(page.get_by_role('dialog')).to_contain_text(title)
    page.get_by_role('button', name='Согласовать расход', exact=True).click()
    expect(page.locator('.decision-row')).to_have_count(2)
    page.get_by_role('button', name='Отменить действие', exact=True).click()
    expect(page.locator('.decision-row')).to_have_count(3)
    page.get_by_role('button', name='Создать', exact=True).click()
    page.locator('.create-popover').get_by_role('button', name=re.compile('Заявку на расход')).click()
    dialog = page.get_by_role('dialog')
    expect(dialog).to_have_class(re.compile('form-sheet'))
    expect(dialog.get_by_label('Название расхода')).to_be_focused()
    bounds = dialog.bounding_box()
    assert abs(bounds['x'] + bounds['width'] - 1440) < 2, 'Form drawer must attach to the right edge'
    page.screenshot(path=str(OUT / 'request-form-1440.png'))
    page.set_viewport_size({'width': 390, 'height': 844})
    expect(dialog).to_be_visible()
    page.wait_for_function('document.documentElement.scrollWidth <= innerWidth')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    page.screenshot(path=str(OUT / 'request-form-390.png'))
    print('PASS: direct decision from dashboard, undo and responsive creation drawer', flush=True)
    assert not errors, errors
    browser.close()
