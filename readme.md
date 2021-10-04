#### Описание
Приложение для проведения вупогонок. В том числе тренеровок в автоматическом режиме.
Пилоты загружаются из xls. 
Имена пилотов выгружаются в Tiny View Plus автоматически

Во время вызова пилотов можно увеличить время на подготовку на 60 секунд нажатием пробела

# Требования
Tiny View Plus от mcheli
linux:

<!---Для TVP нужен opencv 3.2 : https://github.com/opencv/opencv/releases/tag/3.2.0
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



OBS 26.1 или новее
    linux: https://obsproject.com/wiki/install-instructions#linux
    
https://github.com/Palakis/obs-websocket - WebSockets API for OBS Studio. 4.9.0 или новее
    win: https://github.com/Palakis/obs-websocket/releases/download/4.9.0/obs-websocket-4.9.0-Windows-Installer.exe
    linux: https://github.com/Palakis/obs-websocket/releases/download/4.9.0/obs-websocket_4.9.0-1_amd64.deb


#### запуск

`npm start`

#### сборка
#####Electron Packager
Для сборки под win нужен установленный Wine 1.6 и больше
`npm run make-win`


#### Особенности
-Каналы берем из xls, так как пилоты будут просить записать их на определенный канал
-Порядковый номер в xls нужен для удобства заполнения файла


#### Настройки
**Время на гонку.** 
Если 0, то после отсчета времени на подготовку таймер остановится. Надо провести гонку в Tiny View Plus. Переключить группу.
Если не 0, то запустится отсчет гонки. После автоматически поменяется группа. Для гонок без TVP.

**Количество повторов** Если время на гонку не 0, то количество проходов по всем группам. Емли 0 - бесконечно. 

Стандартные режимы
-тренеровка без трансляции:
не использовать TVP [V]
время на гонку [180]
время на подготовку [60]

-тренеровка с трансляцией и OBS
не использовать TVP [ ]
время на гонку [180] 
время на подготовку [60]

-тренеровка с трансляцией и без OBS
Не удобна, так как придется переключать экраны

-multiGP без трансялции
-multiGP с трансляцией и TVP
-multiGP с трансляцией и TVP и без OBS

-гонка за места без трансляции
-гонка за места с трансляцией и TVP
-гонка за места с трансляцией и TVP и без OBS






#### На память о начале разработки

Удалить старую версию node

`sudo apt purge nodejs`

Скачать и установить новую. Например

`sudo tar -C /usr/local --strip-components 1 -xf node-v14.15.0-linux-x64.tar.xz`

`npm install`

`git init` - инициализирует git в текущей папке


scripts.js обновляется по ctrl-R
main.js надо перезапускать

###### bootstrap
bootstrap.min.css и bootstrap.min.css.map копируем в проект вручную


###### сборка TVP под Linux
Готовая сборка, скорее всего, не запустится на другой машине. Надо собирать.

tvp берем от mchelli
    https://github.com/mchelifpv/tinyviewplus

https://openframeworks.cc/setup/linux-install/

В OF устанавливаем
$ cd addons/
$ git clone -b fix-of_v0.10 https://github.com/t-asano/ofxTrueTypeFontUC.git
$ git clone https://github.com/t-asano/ofxAruco.git
$ git clone https://github.com/kylemcdonald/ofxCv.git
$ git clone https://github.com/t-asano/ofxZxing.git
$ git clone https://github.com/t-asano/ofxJoystick.git

В папке проекта в addons.make:
ofxTrueTypeFontUC
ofxOsc
ofxAruco
ofxZxing
ofxJoystick
ofxXmlSettings
ofxCv
ofxOpenCv
ofxPoco


For the correct definition of cameras, is required error correction in openFrameworks. Locate file "../libs/openFrameworks/video/ ofGstVideoGrabber.cpp". Find the line:
    guint cap = v2cap.capabilities;
Replace it with:
    guint cap = v2cap.device_caps;
Rebuild openFrameworks. See here for more info: openframeworks/openFrameworks#6556


Компиляция
make

Запуск
make run
или
./bin/tvp


#OSC
Новые команды для tiny view plus
##js
const osc = require('node-osc');
const client = new osc.Client('127.0.0.1', 4000);
client.send('/v1/setdurasecs', 300); // длительность гонки в сек
client.send('/v1/setduralaps', 10); // количество кругов
client.send('/v1/startrace', ""); // запуск гонки


#Материалы
https://github.com/MylesBorins/node-osc/blob/main/examples/esm.mjs
https://www.electronjs.org/docs/api/ipc-main#ipcmain
https://github.com/t-asano/ofxAruco
https://github.com/t-asano/tinyviewplus/tree/master/src
https://github.com/t-asano/tinyviewplus/blob/master/docs/HowToBuild.md
https://github.com/mchelifpv/tinyviewplus/releases/tag/v0.9.31-Multilingual
http://mcheli.blogspot.com/2019/11/tinyviewplus-eachine-rotg02-review.html
https://github.com/mchelifpv/tinyviewplus/blob/MCHeli/docs/OSCAPI_en.md
https://github.com/obs-websocket-community-projects/obs-websocket-js/issues/223
https://github.com/Palakis/obs-websocket/blob/4.x-current/docs/generated/protocol.md#createscene

#Организация
Если использовалась засечка и по результатам квалификаций у нескольких пилотов одинакое кол-во очков, 
то можно ранжировать их по сумме времени всех раундов / на сумму кругов. Так минимально влияние ручного ввода 
результатов при ошибке срабатывания засечки.  
Лучшее время использовать не рекомендую, так как стабильность важнее.


#Начало
OBS+TVP
-------
Запустить TVP - проверить прием. Выйти, чтобы разгрузить систему
Запустить OBS
Подключить проектор
Запустить WR
WR Проверить связь с OBS
OBS Вывести на пректор /*todo*/
Запустить гонку. Проверить сменяемость сцен


Ошибки засечки
--------------
В квалификации на круги.
Добавлять круги. Не останавливать гонку пробелом.


Возможности
-----------
+Правила - Тренеровка
Правила - Турнир
Правила - Квалификация
Правила - ДЭ8
+Автоматическая смена сцен в OBS - вызов пилотов - засечка
+Вызов пилотов на экране
+Возможность сделать гонку с судьями
+Фиксированое время на подготовку и автоматический старт гонки
+Возможность увеличить время на подготовку на 60с
+Возможность поставить на паузу 
+Экспорт имен в засечку
Возможность восстановить и продолжить гонку после аварийной остановки
Экспорт результатов
Backup результатов в файл
Промежуточные результаты
Вводить результаты при гонке без засечки
+Импорт результатов из засечки 
Возможность корректировки результатов при гонке с засечкой
Контроль каналов