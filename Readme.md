
# Pomembne informacije
Aplikacija ni odporna na napake in zna crashat. Če se to zgodi se jo ponavadi najbolj splača zagnat še enkrat in se izogibati dejanju, ki je povzročilo napako
Pri ravnanju z aplikacijo skladno z navodili naj ne bi prišlo do napak.
Še posebej previdni bodite ko spreminjate podaatke od katerih so odvisni drugi podatki (npr. ime naprave v omrežju)

Aplikacija validira JSON ob uvozu in ne bo sprejela nevalidnih projektnih datotek

Projektne datoteke so shranjene v $HOME/.ViacheslavTelelyukhinProtcolTool/

Del aplikacije za zajemanje paketov je še posebej nestabilen. Če v prvo ne dela poskusite zagnat aplikacijo kot administrator (sudo). Če med zagonom kot administrator aplikacija ustvari datoteko (ali ob debug zagonu) lahko povzroči težave z dostopom ne-root uporabnikom.

Spremebe v projektu se ne shranjuje avtomatsko. Treba ih je shraniti z gumbom za shranjevanje.

V direktoriju example je nekaj demo skript in projektov.

Da odprete devtools v oknih aplikacije odkomentirajte *.openDevTools() v main.ts

# Navodila za uporabo
Prvo moramo ustvariti ali uvoziti projekt. Priporočam uvoz enega od projektov iz primerov (./examples/*.json).

Kot naslednji korak definiramo enkapsulacijo in elemente protokola pod "layers".  Najvišja napisana plast nastopa kot aplikacijska.
Elementu ponavadi določimo nekaj parametrov (trenutno le naslovi drugih elementov). Potem elementu določimo stanja. Začetno stanje je na grafu označeno z modrim ozadjem. Vsakemu stanju je treba določiti vrste sporočil, ki jih lahko pošlje / sprejme in kako se ob tem stanje spremeni.
V plasti protokola lahko vsem vrstam sporočila določimo tudi okvir. Vsakemu polju v okviru določimo velikost v bitih in podatkovni tip (ta vpliva na prikaz podatka ob sledenju omrežnega prometa). Velikost lahko določimo s konstnto, javascript funkcijo ali napišemo -1, da polje zavzame vse ostale bite. Če velikost polja določamo s funkcijo, ta funkcija dobi en argument, ki je JavaScript objekt, ki vsebuje vsa polja tega okvira pred tem poljem.
Če je vrst sporočil, ki ih lahko nek element obravnava več, moramo tudi določiti funkcijo, ki pregleda paket in določi vrsto sporočila, ki smo jo prejeli/poslali.

Nato defriniramo omrežja nad katerimi želimo izvajati simulacije. Moramo biti previsni, da smo protokol določili dovolj dobro, da ga ne bo treba preveč spreminjati, saj lahko večje spremembe protokola (zamenjava/brisanje plasti, spremembe parametrov elementov, brisanje vrst elementov) pokvarijo omrežje in ga bo treba ponovno nastaviti.
V omrežju definiramo "naprave", ki so skupine elementov protokola, predstavljajo naj logične skupine elementov (npr. na umesniki na fizični napravi, porti od aplikacije...). V napravi določimo en ali več elementov protokola, katerim lahko določimo IP naslov (za simulacijo z zajemom omrežnega prometa) in parametre, ki smo ih definirali v protokolu. 
Graf omrežja trenutno riše le povezave najvišje (aplikacijske) plasti protokola. Isto velja za simulacijo stanj omrežja (Perturbiranje Globalnih Stanj Sistema).

Ko imamo definirano omrežje lahko zaženemo simulacijo stanj omrežja. Ta ustvari graf vseh možnih stanj omrežja in nariše prehode med njimi. Ta simulacija trenutno predpostavi, da je pošiljanje in sprejemanje sporočil takojšnje (dva elementa ne morata poslati sporočilo istočasno). Simulacija trenutno ne kaže ali izpiše napak, to je prepuščeno uporabnku. Če želimo, bolj pregleden graf pritisnemo gumb za balanciranje grafa, ali ga sami uredimo. Balanciranje grafa uporabi kinetični algoritem torej bo ohranil pribljižno obliko grafa.
Izvedemo lahko tudi "simulacijo" z zajemom omrežnega prometa. V tej simulaciji dobimo okno za vsak element protokola, v oknu so prikazani paketi, ki so potovali po IPv4 naslovu in TCP/UDP portu, ki smo jih določili tistemu elemntu. Aplikacija trenutno ne podpira drugih transportov ali IP protokolov za zajem paketov. Aplikacija poskusi dekapsulirati pakete, ki ih vidi. Podpira le Ethernet-IEEE802.3-10MB -> IPv4 -> UDP/TCP, drugače prepusti dekapsulacijo protokolu, ki ga je definiral uporabnik. Aplikacija trenutno ne podpira pošiljanja paketov iz te simulacije ali fragmentacije sporočil. Nad seznamom prejetih paketov imamo graf stanj elementa, z modro barvo poudari trenutno stanje v katerem naj bi bil element glede na zajete pakete. Aplikacija trenutno ne zna določiti če je paket prišel ali zapustil napravo, zato to naredi s pomočjo IP in porta vira. Zajeti paketi se nikamor ne shranjujo.

Nekaj bolj tradicionalnih terminov za pojme znotraj programa (pribljižno):
Omrežje - sistem
naprava.umesnik - process
povezava (v omrežju) - kanal
poslano sporočilo - oddajni dogodek
sprejeto sporočilo - sprejemni dogodek
lokalni dogodek lahko simuliramo z prejemnim in oddajnim dogodkom samemu sebi (bo potem tudi dodano v orodje)
simulacija - drevo globalnih stanj sistema (v našemu primeru ni dejansko drevo, ker rišemo vsako stanje le enkrat)

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