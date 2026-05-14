
# Pomembne informacije
Aplikacija ni odporna na napake in zna crashat. Če se to zgodi se jo ponavadi najbolj splača zagnat še enkrat in se izogibati dejanju, ki je povzročilo napako
Pri ravnanju z aplikacijo skladno z navodili naj ne bi prišlo do napak.
Še posebej previdni bodite ko spreminjate podaatke od katerih so odvisni drugi podatki (npr. ime naprave v omrežju)

Aplikacija validira JSON ob uvoozu in ne bo sprejela nevalidnih projektnih datotek

Projektne datoteke so shranjene v $HOME/.ViacheslavTelelyukhinProtcolTool/

Del aplikacije za zajemanje paketov je še posebej nestabilen. Če v prvo ne dela poskusite zagnat aplikacijo kot administrator (sudo). Če med zagonom kot administrator aplikacija ustvari datoteko (ali ob debug zagonu) lahko povzroči težave z dostopom ne-root uporabnikom.

# Navodila za uporabo
TODO!!!

# Navodila za zagon
1: klonirajte repozitorij z ```git clone```

2: raženite ```yarn install```. Zadeva mogoče dela z npm, ampak ker sem med razvojem uporabljal yarn bo bolje delal

3: popravite datoteko ```node_modules/@xyflow/react/dist/esm/index.d.ts```. Skripta vsebuje konfliktno definicijo, ki povzroči TypeScript napako in prepreči kompilacijo projekta. YTo napako je treba popravljati po vsakem zagonu package managerja.
Zakomentirati ali izbrisati je treba linijo 39 ```export type Handle = HandleBound;```. Datoteka naj ne exportira tipa Handle ampak le React komponento handle (linija 2) ```export { Handle, type HandleProps } from './components/Handle';```.

Skripta replace.sh avtomatsko vnese popravek za uporabljeno verzijo datoteke. 

4: za debug zagon uporabite yarn start.

5: za "kompilacijo" uporabite yarn make. Če želite uporabiti tretjo platformo jo določite kot yarn make --darwin.

Applikacija bo v ```out/application-PLATFORMA-ARHITEKTURA/application.app```.
Ivedljiva datoteka bo v ```out/application-PLATFORMA-ARHITEKTURA/application.app/Contents/PLATFORMA/application```