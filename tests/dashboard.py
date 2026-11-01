"""Dashboard business flows: filters, drill-down, queues, sorting and responsive chart."""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = os.environ.get('ROMEO_TEST_URL', 'http://127.0.0.1:5173')
OUT = Path(os.environ.get('ROMEO_DASHBOARD_ARTIFACTS', '/tmp/romeo-dashboard'))
OUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 960}, reduced_motion='reduce', accept_downloads=True)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    table = page.locator('.dashboard-store-table')
    expect(table.locator('tbody tr')).to_have_count(8)
    expect(table.locator('tbody tr').first).to_contain_text('Самал')
    page.get_by_label('Сортировка магазинов').select_option('profit')
    expect(table.locator('tbody tr').first).to_contain_text('Ботанический')
    page.get_by_label('Сортировка магазинов').select_option('change')
    expect(table.locator('tbody tr').first).to_contain_text('Гоголя')
    page.get_by_label('Период', exact=True).select_option('quarter')
    expect(page.get_by_label('Сортировка магазинов')).to_have_value('revenue')
    expect(page.locator('.dashboard-metrics')).not_to_contain_text('%')
    expect(table.locator('tbody tr').first).to_contain_text('Нет сравнения')
    page.get_by_label('Период', exact=True).select_option('month')
    page.get_by_label('Сортировка магазинов').select_option('revenue')
    print('PASS: all stores shown, revenue/profit/change ranking and unavailable comparison fallback', flush=True)

    page.get_by_role('group', name='Показатель графика').get_by_role('button', name='Прибыль', exact=True).click()
    expect(page.get_by_role('heading', name='Прибыль по дням')).to_be_visible()
    expect(page.get_by_role('button', name='Прибыль', exact=True)).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('.dashboard-chart-summary')).to_contain_text('1,92 млн')
    page.get_by_label('Магазин', exact=True).select_option('s1')
    page.get_by_label('Период', exact=True).select_option('week')
    expect(table.locator('tbody tr')).to_have_count(1)
    expect(page.locator('.dashboard-queue-row')).to_have_count(1)
    page.get_by_role('button', name=re.compile('^Деньги на счетах')).click()
    expect(page).to_have_url(re.compile(r'#/finance\?.*tab=cash'))
    expect(page.get_by_label('Магазин', exact=True)).to_have_value('s1')
    expect(page.get_by_label('Период', exact=True)).to_have_value('week')
    page.go_back()
    page.get_by_role('button', name=re.compile('^Управленческая прибыль')).click()
    expect(page.get_by_role('heading', name='Отчёт о прибылях и убытках', exact=True)).to_be_visible()
    page.go_back()
    page.get_by_role('button', name='Сбросить фильтры').click()
    print('PASS: chart changes metric, filters scope the dashboard and financial drill-down preserves context', flush=True)

    requests_count = page.locator('.dashboard-queue-row').count()
    page.get_by_label('Период', exact=True).select_option('yesterday')
    expect(page.locator('.dashboard-queue-row')).to_have_count(requests_count)
    assert page.locator('.dashboard-chart .recharts-area-dot').count() == 1
    page.get_by_role('group', name='Очередь действий').get_by_role('button', name=re.compile('Задачи')).click()
    row = page.locator('.dashboard-queue-row').first
    title = row.locator('strong').inner_text()
    expect(row).to_contain_text('Проверить расход без документа')
    row.click()
    expect(page.locator('.task-card')).to_have_count(1)
    expect(page.locator('.task-card')).to_contain_text(title)
    page.go_back()
    page.get_by_label('Период', exact=True).select_option('month')
    for _ in range(3):
        page.locator('.dashboard-queue-row').first.click()
        page.get_by_role('button', name='Согласовать расход', exact=True).click()
    expect(page.get_by_text('Все заявки рассмотрены', exact=True)).to_be_visible()
    page.get_by_role('button', name='Отменить действие', exact=True).click()
    expect(page.locator('.dashboard-queue-row')).to_have_count(1)
    page.get_by_role('button', name='Перейти к заявкам').click()
    expect(page.locator('.requests-table tbody tr')).to_have_count(1)
    print('PASS: current queues independent of report period, task drill-down, approve, empty state and undo', flush=True)

    page.close()
    page = browser.new_page(viewport={'width':1440,'height':960}, reduced_motion='reduce')
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    page.get_by_role('button', name='Сменить роль').click()
    page.get_by_role('button', name=re.compile('Управляющий')).click()
    expect(page.get_by_role('heading', name='Ваш магазин в цифрах')).to_be_visible()
    expect(page.locator('.dashboard-store-table tbody tr')).to_have_count(1)
    expect(page.get_by_role('heading', name='В работе', exact=True)).to_be_visible()
    page.locator('.dashboard-queue-row').first.click()
    expect(page.get_by_role('button', name='Согласовать расход', exact=True)).to_have_count(0)
    print('PASS: manager sees only their store and cannot approve', flush=True)

    for width in [360, 390, 768, 1024, 1440]:
        view = browser.new_page(viewport={'width': width, 'height': 960 if width > 800 else 844}, reduced_motion='reduce')
        view.on('pageerror', lambda error: errors.append(str(error)))
        view.goto(URL, wait_until='networkidle')
        view.locator('.dashboard-chart').scroll_into_view_if_needed()
        expect(view.locator('.dashboard-chart .recharts-surface')).to_be_visible()
        bounds = view.locator('.dashboard-chart .recharts-surface').bounding_box()
        assert bounds['width'] > 200 and bounds['height'] > 150, (width, bounds)
        assert not view.evaluate('document.documentElement.scrollWidth > innerWidth'), width
        if width <= 620:
            expect(view.locator('.dashboard-mobile-profit').first).to_be_visible()
        view.evaluate('window.scrollTo(0,0)')
        view.screenshot(path=str(OUT / f'overview-{width}.png'), full_page=True)
        view.close()
    assert not errors, errors
    print('PASS: chart renders, table remains usable, no overflow or JavaScript errors at five widths', flush=True)
    browser.close()
