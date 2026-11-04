import json, math, sys
SRC='/home/user/nvkelso/natural-earth-vector/geojson/'
L0,L1,B0,B1=-24.0,62.0,19.0,64.0
TOL=0.015

def dp(pts,tol):
    if len(pts)<3: return pts
    keep=[False]*len(pts); keep[0]=keep[-1]=True
    st=[(0,len(pts)-1)]
    while st:
        a,b=st.pop()
        if b<=a+1: continue
        ax,ay=pts[a]; bx,by=pts[b]; dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy
        md,mi=-1,-1
        for i in range(a+1,b):
            px,py=pts[i]
            if L==0: d=math.hypot(px-ax,py-ay)
            else:
                t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L)); d=math.hypot(px-(ax+t*dx),py-(ay+t*dy))
            if d>md: md,mi=d,i
        if md>tol: keep[mi]=True; st.append((a,mi)); st.append((mi,b))
    return [p for p,k in zip(pts,keep) if k]

def clip_poly(ring):
    def inside(p,e):
        k,v=e
        return p[0]>=v if k=='xmin' else p[0]<=v if k=='xmax' else p[1]>=v if k=='ymin' else p[1]<=v
    def inter(p,q,e):
        k,v=e
        if k in('xmin','xmax'):
            t=(v-p[0])/(q[0]-p[0]); return (v,p[1]+t*(q[1]-p[1]))
        t=(v-p[1])/(q[1]-p[1]); return (p[0]+t*(q[0]-p[0]),v)
    out=ring
    for e in (('xmin',L0),('xmax',L1),('ymin',B0),('ymax',B1)):
        inp=out; out=[]
        if not inp: break
        s=inp[-1]
        for p in inp:
            if inside(p,e):
                if not inside(s,e): out.append(inter(s,p,e))
                out.append(p)
            elif inside(s,e): out.append(inter(s,p,e))
            s=p
    return out

def clip_line(pts):
    segs=[]; cur=[]
    def ins(p): return L0<=p[0]<=L1 and B0<=p[1]<=B1
    for p in pts:
        if ins(p): cur.append(p)
        else:
            if cur: segs.append(cur); cur=[]
    if cur: segs.append(cur)
    return segs

def rnd(pts): return [[round(x,3),round(y,3)] for x,y in pts]

def bbox_hit(coords):
    xs=[c[0] for c in coords]; ys=[c[1] for c in coords]
    return not (max(xs)<L0 or min(xs)>L1 or max(ys)<B0 or min(ys)>B1)

land=json.load(open(SRC+'ne_50m_land.geojson'))
polys=[]
for f in land['features']:
    g=f['geometry']; parts=g['coordinates'] if g['type']=='Polygon' else [p for mp in g['coordinates'] for p in [mp]]
    for poly in (g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]):
        rings=[]
        for ring in poly:
            if not bbox_hit(ring): continue
            c=clip_poly([tuple(p) for p in ring])
            if len(c)<4: continue
            c=dp(c,TOL)
            if len(c)<4: continue
            if c[0]!=c[-1]: c.append(c[0])
            rings.append(rnd(c))
        if rings: polys.append(rings)
landgj={"type":"MultiPolygon","coordinates":polys}

lakes=json.load(open(SRC+'ne_50m_lakes.geojson'))
lk=[]
for f in lakes['features']:
    g=f['geometry']
    for poly in (g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]):
        ring=poly[0]
        if not bbox_hit(ring): continue
        c=clip_poly([tuple(p) for p in ring]); c=dp(c,TOL)
        if len(c)<4: continue
        if c[0]!=c[-1]: c.append(c[0])
        lk.append([rnd(c)])
lakesgj={"type":"MultiPolygon","coordinates":lk}

RIV={'Rhine','Danube','Rhône','Rhone','Po','Elbe','Weser','Main','Loire','Seine','Garonne','Ebro','Tagus','Tajo','Guadalquivir','Duero','Douro','Nile','Euphrates','Tigris','Don','Dnieper','Dniester','Dnepr','Southern Bug','Prut','Tisza','Sava','Drava','Morava','Volga','Kuban','Kura','Aras','Araks','Karun','Oder','Vistula','Thames','Severn','Shannon','Meuse','Maas','Scheldt','Mosel','Moselle','Neckar','Inn','Drina','Olt','Siret','Maritsa','Vardar','Struma','Orontes','Jordan','Halys','Kizil Irmak','Kızılırmak','Sakarya','Menderes','Seyhan','Ceyhan','Khabur','Great Zab','Diyala','Terek','Medjerda','Chelif','Moulouya','Sebou','Guadiana','Ural'}
riv=json.load(open(SRC+'ne_50m_rivers_lake_centerlines.geojson'))
rl=[]; names=set()
for f in riv['features']:
    nm=f['properties'].get('name') or ''; nm_en=f['properties'].get('name_en') or ''
    if nm not in RIV and nm_en not in RIV: continue
    g=f['geometry']
    for line in (g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]):
        for seg in clip_line([tuple(p) for p in line]):
            seg=dp(seg,TOL)
            if len(seg)>=2: rl.append(rnd(seg)); names.add(nm_en or nm)
rivgj={"type":"MultiLineString","coordinates":rl}
js="window.GEO="+json.dumps({"land":landgj,"lakes":lakesgj,"rivers":rivgj},separators=(',',':'),ensure_ascii=False)+";"
open('geo.js','w').write(js)
print(len(js)//1024,'KB', 'land polys',len(polys),'lakes',len(lk),'river segs',len(rl)); print(sorted(names))
