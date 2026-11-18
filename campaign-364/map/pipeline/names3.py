# Small-province names for the new partition: inherit the ancient name of the old small province that held most of the land,
# with explicit names where the new province borders split or extend the old ones. Key: (province, first CK3 county).
import json, collections
OVR={('Лугия','krakowska'):'Buri',('Македония Прима','ohrid'):'Lyncestis',('Дардания','skopje'):'Scupenses',('Ахея','aetolia'):'Aetolia',
('Македония Прима','serres'):'Bisaltia',('Мезия Секунда','mesembria'):'Odessus',('Дакия Прибрежная','vratsa'):'Triballi',('Гетия','galati'):'Britolagae',
('Полесье','lomzynska'):'Phrugundiones',('Квадия','cieszyn'):'Racatae',('Полесье','lviv'):'Atmoni',('Карпатия','terebovl'):'Sidones',
('Карпатия','marmaros'):'Piengitae',('Боспор','kerch'):'Bosporani',('Скифия Азиатская','sarysyn'):'Chaenides',('Аорсия','azov'):'Psessii',
('Абазгия','abkhazia'):'Abasci',('Синдика','zichia'):'Cercetae',('Зихия','abkhazia'):'Zichi',('Аорсия','sarkel'):'Aorsi',('Софена','mesopotamia'):'Anzitene',
('Гонориада','tarsos'):'Caucones',('Пафлагония','galatia'):'Timonitis',('Писидия','pisidia'):'Pisidae',('Памфилия','lycia'):'Pamphyli',
('Британия Прима','dorset'):'Durotriges',('Карфагена','alicante'):'Deitania',('Приморские Альпы','nice'):'Vediantii',('Нарбоника Секунда','provence'):'Oxybii',
('Германия Секунда','bouillon'):'Tungri',('Аквитания Прима','nevers'):'Noviodunum',('Саксония','tecklenburg'):'Ampsivarii',('Сикамбрия','zutphen'):'Bructeri',
('Эмилия','piacenza'):'Anamares',('Тусция','luni'):'Luna',('Тусция','lucca'):'Etruria',('Вариния','spreewald'):'Nuithones',('Алеманния','eichstadt'):'Raetovarii',
('Семнония','gorlitz'):'Corconti',('Паннония Прима','vienna'):'Azali',('Полесье','angerburg'):'Sudini',('Мидия','qazwin'):'Dailamitae',('Атропатена','zanjan'):'Cadusii',
('Кордуена','urmiya'):'Matiane',('Мазендеран','damghan'):'Comisene',('Мазендеран','khuwar'):'Choarene',('Спахан','yazd'):'Carmania Deserta',
('Парс','shahre-babak'):'Pasargadae',('Мешан','arrajan'):'Uxii',('Спахан','sardan'):'Gabiene',('Африка','annaba'):'Massyli',('Асуристан','samarra'):'Apolloniatis',
('Адиабена','ninive'):'Aturia',('Софена','bakriya'):'Ingilene',('Палестина Секунда','tiberias'):'Galilaea',('Фиваида','kharga'):'Oasis Magna',
('Ангельн','sjaelland'):'Dani',('Ангельн','fyn'):'Heruli',('Ахея','cephalonia'):'Cephallenia',('Острова','rhodos'):'Cyclades',('Полесье','smolensk'):'Hamaxobii',
('Ойум','tula'):'Alauni',('Ойум','sevsk'):'Navari',('Ойум','novosil'):'Tagri',('Скифия Азиатская','ashli'):'Modocae',('Скифия Азиатская','kozlov'):'Mordens',
('Парс','behabad'):'Carmania',('Парс','hormuz'):'Harmozia',('Парс','jabal_kufs'):'Camelobosci',('Фиваида','aydhab'):'Blemmyes',('Фиваида','qurta'):'Dodecaschoenus',
('Бахрейн','samman'):'Gerrhaei',('Бахрейн','thalabiya'):'Scenitae',('Хиджаз','hail'):'Agraei',('Хиджаз','tabuk'):'Thamudeni',('Хиджаз','wajh'):'Iathrippa',
('Хиджаз','mecca'):'Macoraba',('Гарамантида','zawila'):'Phazania'}
def small_names(B, PROV, NAMES, old_sp, rome_xy):
    cmap={}
    for g in old_sp:
        for c in g['cs']: cmap[c]=NAMES[g['cs'][0]]
    out=[]
    for g in B['sp']:
        k=(PROV[g['pv']]['n'],g['cs'][0][0])
        if k in OVR: out.append(OVR[k]); continue
        v=collections.Counter()
        for c,a in g['cs']:
            if c in cmap: v[cmap[c]]+=a
        out.append(v.most_common(1)[0][0] if v else g['d'])
    # leftovers that still coincide: the one nearer to Rome is Citerior, the farther Ulterior
    dup=collections.defaultdict(list)
    for i,n in enumerate(out): dup[n].append(i)
    fixed=[]
    for n,ix in dup.items():
        if len(ix)<2: continue
        ix.sort(key=lambda i:(B['sp'][i]['cx']-rome_xy[0])**2+(B['sp'][i]['cy']-rome_xy[1])**2)
        tags=['Citerior','Ulterior'] if len(ix)==2 else ['Citerior','Media','Ulterior']+['%d'%k for k in range(4,10)]
        for t,i in zip(tags,ix): out[i]=f'{n} {t}'
        fixed.append(n)
    return out, fixed
