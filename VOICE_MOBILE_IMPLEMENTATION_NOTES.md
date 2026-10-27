# Mobile Voice Input: передача на полное ревью

Статус: исходники уточнены после сообщённого полного внешнего статического аудита 93 файлов. Исправлено замечание P3 к сообщению ошибки первоначальной загрузки; прежние исправления сохранены. Повторная внешняя приёмка всей реализации ещё требуется. Это отчёт о mobile-подзадаче, не о завершённости всей реализации.

## Изоляция и исходная карта

- Mobile worktree: `/Users/alexander/Code/pioneer/pioneer/.worktrees/voice-transcription-modes-app`.
- Репозиторий-владелец: `/Users/alexander/Code/pioneer/pioneer-app`.
- Ветка: `feat/voice-transcription-modes`.
- Base и HEAD при начале/передаче: `bb2ad274ae6bb9da5accb54c0f0935a0817155c2`; начальный worktree чистый.
- Rust source worktree: `/Users/alexander/Code/pioneer/pioneer/.worktrees/voice-transcription-modes`, base `dcc63b7142bf681cba96de8267a15e8383e82b11`.
- Scoped mobile `AGENTS.md` не найдены. Применимые родительские инструкции изучены в общем контексте; DB/platform/native архитектура не менялась.

Карта, установленная чтением перед UI-изменениями: mobile не показывал Voice Input в Settings. Существуют `ClientScope::SettingsPage { page: Voice }`, `SettingsPagePublication`, `SettingsModelPickerIntent/Publication`, общий `dispatchSettings`, scoped subscriptions в `MobileClientBinding`, platform voice target guards и общий Nitro dispatch. Новый bridge method и второй settings core не нужны. Владельцы capture/PCM, gateway ASR, cancellation/generation/lease в этой подзадаче не меняются.

## UI и путь значения

`SettingsScreen` в прежней структуре содержит новый `VoiceInputSettings` перед блоком Language/Theme. Внутри Voice Input порядок: стандартный native Switch включения Voice Input → строка выбора ASR-модели → непосредственно следующая отдельная строка режима (между строками только штатный divider) → статусы/ошибки/повтор.

Строка режима: слева локализованные название и описание, справа native `Switch`, с `accessibilityLabel`, `accessibilityHint`, published value и disabled. RU строки точно соответствуют заданию. Добавлены ресурсы en, ru, de, es, fr, hi, ja, zh. Нет отдельного экрана/диалога режима или дополнительной кнопки сохранения. Model sheet содержит только выбор модели.

В инвентарь изменений входит также `src/locale/translations/resources.json`, который импортируется `src/locale/i18n.ts`: вручную синхронизированы только добавленные `settings.voice` для en, ru, zh, hi, es, de, fr, ja из `src/locale/resources/<locale>/settings.json`, включая английский fallback. Сохранены minified-формат bundle и все остальные данные. Штатный locale generator не запускался.

`useSettingsPage('voice')` подписывается через существующий `MobileClientBinding.scope`, т.е. scope lifecycle/demand и publications остаются в Rust/binding. `dispatchSettings` отправляет `ClientIntent::Settings`, сразу draining voice page для pending/error; дальнейшие публикации получает существующий binding event loop. Новый polling не добавлен.

Режим отправляется исключительно через `{ kind: 'voice_transcribe_while_recording', enabled }`; значение берётся из `SettingsPageValue::Voice.settings.transcribe_while_recording`. Локальный default и локальный persisted override отсутствуют. Пока bool не появился в native publication, отображается ожидание; старый binary не выдаётся за новую реализацию. Default true и legacy compatibility принадлежат Rust.

Выбор модели открывает существующий shared picker в режиме `Transcription`. Так как protocol поддерживает только Local, для ещё не выбранного provider в sheet проецируется Local; конкретная модель не выбирается автоматически. Каталог, порядок моделей, выбор и авторизация остаются в Rust. Нажатие модели сначала dispatch-ит `select_model` с `expected_owner`, проверяет актуальную publication и передаёт `{ kind: 'voice_model', provider, model }` в общий settings path. Этот intent не содержит поля режима. Shared `needs_selection` открывает model sheet при первом включении без модели.

Pending/loading и отсутствие `can_manage_gateway_settings` отключают controls; offline показывается локализованно. Ошибка сохранения берётся из shared page, отображается рядом со строками; rejected/stale dispatch показывается как ошибка. Значение Switch не меняется от нажатия до публикации сохранённого значения. Никакие ошибки backend/пользовательский контент не логируются.

Refresh retry показан только при ошибке первоначальной загрузки без authoritative Voice settings. При `settings_save_failed` с имеющимися settings сообщение ошибки и опубликованное значение остаются, а вводящая в заблуждение Refresh-кнопка скрыта: чтение не повторяет mode intent и не очищает PageAction.error. Повторить сохранение можно существующим переключателем; локальный последний intent или копия persisted mode не добавлялись. Retry подготовки модели остаётся отдельным существующим действием.

Для model sheet сохраняется target `(gatewayId, connectionId, workspaceId)` и owner generation. Перед открытием, изменением и применением выбора используются существующие `isVoiceInputGatewayTargetActive` guards. При смене gateway/connection, закрытии native picker, потере права или переходе в disabled sheet закрывается. Cleanup отправляет `close` с конкретным owner. Shared runtime дополнительно держит собственные epoch/navigation/authorization fences. Старые callbacks не могут применить выбор к следующему gateway.

## Ручные snapshots

Ни один schema/type generator не запускался. Минимально вручную обновлены следующие **13 JSON** `src/client/schema/<name>.json` и соответствующие **13 TypeScript** `src/client/generated/<name>.ts`:

- `cli_runtime_provider_settings_plan`
- `client_intent`
- `client_intent_dispatch_dto`
- `gateway_settings_get_response`
- `gateway_settings_state`
- `gateway_settings_store`
- `gateway_settings_update_plan`
- `gateway_settings_update_response`
- `gateway_ws_event`
- `settings_page_publication`
- `voice_input_settings_action`
- `voice_input_settings_plan`
- `voice_input_settings_plan_request`

Содержание: bool/default true в `GatewayVoiceInputSettings`, optional/nullable bool в update, новый SettingsIntent/VoiceInputSettingsAction и nested default `voice_input` с true. TS snapshot свойства optional согласно текущему serde/default schema-паттерну. JSON property/enum и TS union order могут отличаться от будущей канонической генерации; эквивалентность штатной генерации НЕ подтверждена.

Boundary-source manifest, hashes/seals, SDK/dependencies и prebuilt native libraries не менялись.

## Написанные, не запущенные тесты

`src/screens/settings/components/voice-input.test.tsx`, существующий Jest/react-test-renderer harness:

- фактический порядок model/mode текста в rendered tree;
- published false → intent true без optimistic локального изменения → published true;
- shared model picker dispatch/owner → model-only settings intent, режим остаётся false;
- отсутствие invented mode для старой native publication;
- включение режима → публикация `settings_save_failed`: опубликованный false и ошибка сохраняются, Refresh retry отсутствует, доступный переключатель снова отправляет mode intent без optimistic изменения;
- ошибка первоначальной загрузки `settings_load_failed` без authoritative settings: отображается `voice.loadFailed`, отсутствует `voice.saveFailed`, Retry остаётся доступным и отправляет Refresh;
- старые callbacks не dispatch-ят после смены активного target;
- pending и недостаток прав блокируют controls/dispatch.

Это mobile UI/adapter proof с fake publications; оно не заменяет shared Rust/gateway lifecycle tests. Существующий `index.test.tsx` изолирует новый дочерний блок, чтобы прежние assertions про account/members/settings navigation остались неизменными. Новое поведение проверяется отдельно.

Существующий `src/locale/translations/resources.test.ts` проверяет соответствие runtime bundle исходным namespace-файлам; он сохранён без изменений, дублирующий тест не добавлен. Ни он, ни уточнённые UI-тесты не запускались.

## Статический самоаудит

Прослежены UI → SettingsIntent → existing binding/FFI dispatch → shared runtime и published value → UI; модель/режим отправляются независимыми intents. Проверены owner/target guards, pending/error, native Switch label/hint, cleanup и отсутствие TS mode defaults. При чтении исправлены: незаметное первое включение без модели (shared needs_selection теперь открывает sheet), пропущенный nested schema default, неверное имя fontWeight token, недостаточное отображение stale dispatch; локализации соседних строк сохранены без переформатирования. Новые/изменённые файлы прочитаны; build/test/typecheck/генерация не подтверждались.

В проходе по двум замечаниям повторного аудита перечитаны runtime i18n import/fallback, namespace voice-объекты, UI/callers и shared обработка Refresh/PageAction.error. Дополнительный diff ограничен runtime bundle, условием Refresh retry, существующим UI-test файлом и двумя отчётами. Посимвольный Git diff bundle содержит только восемь вставок voice-объектов; остальные переводы сохранены. Authoritative value, target/owner guards и прежние cancellation-исправления не менялись.

Фактически в этом проходе выполнялись чтение/поиск (`cat`, `sed`, `rg`), Git `status`/`branch`/`rev-parse`/`diff`, временные копии исходного состояния (`mktemp`, `cp`) и редактирование (`apply_patch`, одноразовая точечная текстовая вставка в bundle через Python). Это редактирование существующего bundle, не запуск штатного генератора или исполняемой проверки. Тесты, formatter, typecheck/lint, приложения и генераторы в этом проходе не запускались.

В последующем проходе P3 изменено только сообщение: `settings_load_failed` без authoritative Voice settings показывает `voice.loadFailed`; ошибки сохранения и rejected/stale действий сохраняют `voice.saveFailed`. Добавлен `loadFailed` во все восемь namespace-файлов и вручную синхронизирован только этот ключ в runtime bundle без изменения остальных данных/формата. В существующий initial-load тест добавлены два assertions на сообщения; failed-save сценарий, Retry, published value, pending и target/owner guards сохранены. После правки перечитаны обе тестовые ситуации, UI-ветка, локализации и весь дополнительный diff. Выполнялись только чтение/поиск (`cat`, `sed`, `rg`), Git `status`/`branch`/`rev-parse`/`diff`, временные копии (`mktemp`, `cp`) и редактирование (`apply_patch`, точечная Python-вставка ключа в bundle). Тесты, formatter, сборки и генераторы не запускались; UI-тесты и существующий `resources.test.ts`, штатная сверка bundle остаются отложенными до явной внешней приёмки.

## После явной внешней приёмки

Все отложенные действия должны выполняться только с точным source pin, из mobile worktree:

```sh
export PIONEER_RUST_ROOT=/Users/alexander/Code/pioneer/pioneer/.worktrees/voice-transcription-modes
```

Текущий fallback относительного Rust path из вложенного mobile-worktree использовать нельзя. До приёмки не запускалось ни одной команды, которая могла бы использовать этот fallback.

После приёмки: штатные `bun run client:schema` и `bun run client:types`; затем предусмотренные contract/source-manifest workflows (`bun run client:contract`, `bun run client:check`) с тем же `PIONEER_RUST_ROOT`. Manifest/hashes должны получаться реальным workflow. Ручная синхронизация translation bundle требует последующей сверки штатным `bun run locale` и существующим `resources.test.ts`. Далее разрешённые targeted Jest/TS/lint и native source builds для iOS/Android через existing scripts с тем же pin, получение актуальных prebuilt/seals, smoke UI в настоящем приложении. Запуск и принятие этих шагов здесь НЕ происходили.

Ограничения: render/keyboard/screen-reader/layout на устройстве не проверены; native binary не пересобран; сравнение snapshots со штатной генерацией отложено. Полнота Rust defaults/persistence/gateway ASR и всего общего diff оценивается родителем и внешним ревьюером.

Тесты, компиляция, cargo check, приложения, модели и генераторы не запускались.
Реализация подготовлена для полного внешнего ревью и ещё не принята.
Запуск проверок — только после явной внешней приёмки.
