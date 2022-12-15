# Описание
Приложение для проведения вупогонок.
 
Автоматический вызов пилотов, старт и финиш при наличии Tiny View Plus от FixFly и OBS.

Приложение состоит из экранов настройки гонки, вызова пилотов, гонки, корректировки результатов, промежуточных и финальных итогов.

Пилоты загружаются из xls. Имена пилотов выгружаются в Tiny View Plus.

Во время вызова пилотов можно увеличить время на подготовку на 60 секунд нажатием Q или поставить на паузу нажатием Пробела.

# Требования
**Tiny View Plus от FixFly** для засечки

**OBS 26.1 или новее** для работы с проектором или внешним экраном. 
(linux: https://obsproject.com/wiki/install-instructions#linux)

**WebSockets API for OBS Studio. 4.9.0 или новее** - https://github.com/Palakis/obs-websocket 

win: https://github.com/Palakis/obs-websocket/releases/download/4.9.0/obs-websocket-4.9.0-Windows-Installer.exe

linux: https://github.com/Palakis/obs-websocket/releases/download/4.9.0/obs-websocket_4.9.0-1_amd64.deb

# Возможности WR

* Правила - Тренеровка
* Правила - Турнир на 4
* Правила - Квалификация
* Правила - Double Elimination на 8
* Автоматическая смена сцен в OBS - вызов пилотов - засечка
* Вызов пилотов на экране
* Импорт пилотов и резултатов из XLS файла
* Возможность сделать гонку с судьями
* Фиксированое время на подготовку и автоматический старт гонки
* Возможность увеличить время на подготовку на 60с - нажать Q
* Возможность поставить на паузу - пробел 
* Автоматический экспорт имен в засечку
* Импорт результатов из засечки 
* Возможность восстановить и продолжить гонку после аварийной остановки
* Экспорт результатов в xls
* Backup результатов каждого вылета в файл
* Промежуточные результаты
* Ввод результаты при гонке без засечки
* Возможность корректировки результатов при гонке с засечкой
* Функция Перелет
* Создание необходимых сцен в OBS
* Проверка связи с OBS
* new Удаление и перемещение пилотов для Квалификации и Тренеровки
* new Можно назначить предупреждения пилотам нажав на имя во время гонки



# Использование
## Подготовка OBS и TVP

Запустить TVP - проверить, что все 4 приемника подключились.

Выяснить какие приемники соответствуют каким экранам TVP. Рекомендую пронумеровать приемники.

Выставить каналы на приемниках.
 
Настроить TVP:
* Set Language: English
* Set System Statistics: off
* Set AR Lap timer mode: Normal
* Set wait for lap after time limit: по желанию
* Set minimum lap time: поставить, чтобы оставить возможность ручной корректировки ошибки засечки
* Set staggered Start: **off**

Выйти из TVP, чтобы разгрузить систему

Запустить OBS. 

Подключить проектор.

Запустить Whoop Race (WR)

В WR проверить связь с OBS

В WR создать сцены в OBS

Настроить сцены в OBS:
* tvp - источник - + - захват игры - захват отдельного окна tvp.exe
* wr -  источник - + - захват отдельного окна whooprace
* break - источник медиа - файл с видео для пауз. Повтор [V]; перезапустить воспроизведение [ ];

В OBS Вывести изображение на пректор:  экран - контекстное меню - полноэкранный проектор - проектор

Запустить гонку. Проверить сменяемость сцен


## Ошибки засечки

* В TVP добавлять (5-6-7-8) или вычитать круги (Alt 5-6-7-8).
* Или после гонки исправить данные на экране результатов



# Правила

## Квалификация

Любое кол-во пилотов

Летят заданное время. Заданное количество раундов.

Если разбить пилотов на четверки и остается один, рекомендую предпоследнюю группу сделать из 3 человек, а последнюю из двух

### Итоги раунда:

Считаем круги и суммарное время для ситуаций с равным количеством очков.

Кто пролетел большее кол-во кругов занимает место выше

Если результат вылета 0, то это не надо дополнительно отрабатывать

### Итоги гонки:

Определяем список игроков для прохода в следующий этап соревнований.

Если несколько пилотов пролетели равное количество кругов смотрим кто летел меньшее количество времени


## Турнир на 1..4

От 1 до 4 пилотов.

Летят заданное количество кругов. Заданное количество раундов.
 
### Итоги раунда:

Считаем места.

Если результат вылета 0, присваиваем следующее свободное место 


## Double Elimination на 8

8 пилотов

Летят заданное количество кругов. Пилоты загружаются в гонку от сильного к слабому.

I вылет: 2-3-5-7 пилот

II вылет: 1-4-6-8 пилот

III: Третий и четвертый из I и II. Определяем 7 и 8 место

IV: Первый и второй из I и II.
 
V: Третий и четвертый из IV, первый и второй из III. Определяем 5 и 6.

VI: Первый и второй из IV, первый и второй из 5. Определяем 1 по 4 места.
 
### Итоги раунда:

Считаем места.

Если результат вылета 0, присваиваем следующее свободное место
 
Если у трех пилотов 0 - перелет этой тройки

Если у двух пилотов 0, то ничего страшного. Влияет только на ранжирование 7/8, 5/6, 3/4. Если они захотят точно выяснить кто из них на этих местах - делаем турнир на двоих на 1 раунд.
 

# Особенности
* Каналы берем из xls, так как пилоты будут просить записать их на определенный канал
* Порядковый номер в xls нужен для удобства заполнения файла
* Для кириллицы в TVP: https://github.com/mchelifpv/tinyviewplus/releases/tag/v0.9.31-Multilingual


## Настройки гонки

**Время на гонку.**

Если установлено "Не использовать TinyViewPlus":

* Время гонки. После отсчета автоматически поменяется группа. Для гонок без TVP.

* 0 - после отсчета времени на подготовку таймер остановится. Надо провести гонку. Переключить группу вручную. Для гонок в обычном TVP.

Если **не** установлено "Не использовать TinyViewPlus":

* Установите время гонки, которое будет передано в TVP.
* 0 - невалидно

**Количество повторов** 

Количество проходов по всем группам. Если 0 - бесконечно. 

### Стандартные варианты

**тренеровка:**
* время на подготовку [60]
* время одной гонки [180]
* повторов [по желанию]

**квалификация:**
* время на подготовку [60]
* время одной гонки [180]
* повторов [по желанию]

**Double:**
* время на подготовку [60]
* время одной гонки [180]
* сколько нужно пройти кругов [по желанию] 

**Турнир без трансляции**
* время на подготовку [60]
* время одной гонки [180]
* сколько нужно пройти кругов [по желанию]
* повторов [по желанию]


# Почему нужен TVP от fixfly
Из-за новых команд OSC:
* client.send('/v1/setdurasecs', 300); // длительность гонки в сек
* client.send('/v1/setduralaps', 10); // количество кругов
* client.send('/v1/startrace', ""); // запуск гонки

И нового сообщения /racefinished с результатами гонки после финиша

# Материалы
* https://github.com/MylesBorins/node-osc/blob/main/examples/esm.mjs
* https://www.electronjs.org/docs/api/ipc-main#ipcmain
* https://github.com/t-asano/ofxAruco
* https://github.com/t-asano/tinyviewplus/tree/master/src
* https://github.com/t-asano/tinyviewplus/blob/master/docs/HowToBuild.md
* https://github.com/mchelifpv/tinyviewplus/releases/tag/v0.9.31-Multilingual
* http://mcheli.blogspot.com/2019/11/tinyviewplus-eachine-rotg02-review.html
* https://github.com/mchelifpv/tinyviewplus/blob/MCHeli/docs/OSCAPI_en.md
* https://github.com/obs-websocket-community-projects/obs-websocket-js/issues/223
* https://github.com/Palakis/obs-websocket/blob/4.x-current/docs/generated/protocol.md#createscene


# Разработка
## Сборка    
Для сборки под win нужен установленный Wine 1.6 и больше

`npm run make-win`


## Запуск под linux

`npm start`

## среда разработки

#### node.js
Удалить старую версию node

`sudo apt purge nodejs`

Скачать и установить новую. Например

`sudo tar -C /usr/local --strip-components 1 -xf node-v14.15.0-linux-x64.tar.xz`

`npm install`


#### bootstrap
bootstrap.min.css и bootstrap.min.css.map копируем в проект вручную



<!---linux:

Для TVP нужен opencv 3.2 : https://github.com/opencv/opencv/releases/tag/3.2.0
Качаем. Делаем Build core modules по инструкции https://docs.opencv.org/master/d7/d9f/tutorial_linux_install.html 
с учетом, скаченного названия файла.
TVP будет ругаться, что не видит libopencv_video.so.3.2
Ищем sudo find / -name "libopencv_video.so.*"
Делаем файл /etc/ld.so.conf.d/opencv.conf и записываем путь к файлу
Исполняем sudo ldconfig -v 

И libpocofoundation62:
https://packages.ubuntu.com/focal/amd64/gcc-10-base/download
https://packages.ubuntu.com/focal/amd64/libgcc-s1/download
https://packages.ubuntu.com/focal/amd64/libpocofoundation62/download

https://github.com/nigels-com/glew#downloads
~прописать /usr/lib64/ в .conf файле в /etc/ld.so.conf.d и обновить кэш sudo ldconfig -v


https://github.com/glfw/glfw
sudo apt install libxrandr-dev
sudo apt install libxinerama-dev
sudo apt install libxcursor-dev
sudo apt install libxi-dev
cmake .
make
sudo make install
sudo ldconfig -v
sudo apt install liburiparser-dev
sudo apt install libfreeimage-dev
https://packages.debian.org/buster/amd64/libboost1.67-dev/download
https://packages.debian.org/buster/amd64/libboost-system1.67.0/download
https://packages.debian.org/buster/amd64/libboost-filesystem1.67-dev/download
sudo add-apt-repository ppa:ubuntu-toolchain-r/test
sudo apt-get update
sudo apt-get install gcc-4.9
sudo apt-get install --only-upgrade libstdc++6 -->

# Разработка TVP под Linux

git clone git@github.com:Egor812/tinyviewplus.git

Потребуется openframeworks: https://openframeworks.cc/setup/linux-install/

(?) https://docs.opencv.org/master/d7/d9f/tutorial_linux_install.html (?)

В OF устанавливаем:
```
$ cd addons/
$ git clone -b fix-of_v0.10 https://github.com/t-asano/ofxTrueTypeFontUC.git
$ git clone https://github.com/t-asano/ofxAruco.git
$ git clone https://github.com/kylemcdonald/ofxCv.git
$ git clone https://github.com/t-asano/ofxZxing.git
$ git clone https://github.com/t-asano/ofxJoystick.git
```

В папке проекта в addons.make запишем:
```
ofxTrueTypeFontUC
ofxOsc
ofxAruco
ofxZxing
ofxJoystick
ofxXmlSettings
ofxCv
ofxOpenCv
ofxPoco
```

For the correct definition of cameras, is required error correction in openFrameworks: 
>Locate file "../libs/openFrameworks/video/ofGstVideoGrabber.cpp". Find the line:
>
>    guint cap = v2cap.capabilities;
>
> Replace it with:
>
>    guint cap = v2cap.device_caps;
>
> Rebuild openFrameworks:
>
>    cd OF/scripts/linux
>    sudo ./compileOF.sh -j3
>
> See here for more info: openframeworks/openFrameworks#6556

Компиляция

`make`

Запуск

`make run` или `./bin/tvp`

**todo** у меня каждая вторая камера выводит пустоту

## Разработка TVP под windows
Установить Visual Studio Community

Установить OpenFrameworks (of)

Скачать библиотеки (см выше )

OpenFrameworks сделан для Visual Studio 2017, но в 2019 работать тоже можно: https://github.com/NYUAD-IM/Software-Art-Image/blob/main/docs/openFrameworksVS2019.md

Через of - projectGenerator делаем пустой проект и копируем туда tvp.

В VS 2019 библиотеки так же добавляем через projectGenerator

Сделать шаги из /docs/HowToBuild.md

Для работы с atlcomcli придется скачать: 
* C++ ATL for latest v142 build tools (x86 x64)
* C++ ATL for latest v142 build tools with Spectre (x86 x64)
* C++ ATL for latest v141 build tools (x86 x64)
* C++ ATL for latest v141 build tools with Spectre (x86 x64)
* C++ MFC for latest v142 build tools with Spectre (x86 x64)

Чтобы убрать окно консоли:
* (!) Project->Linker->System->Subsystem: Windows
* (?) Project->Linker > Options > All Options > Entry Point "mainCRTStartup"

Чтобы убрать ошибку типа Ошибка unresolved external symbol ___dyn_tls_on_demand_init:
Project->Properties->General->Platform ToolSet 142

**todo** нет иконки


