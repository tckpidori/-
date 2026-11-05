import sys, json, math, numpy as np
from collections import defaultdict
def vectorize(lab, tol=1.1):
    H,W=lab.shape
    P=np.full((H+2,W+2),-2,dtype=np.int32); P[1:-1,1:-1]=lab
    CW=W+3
    edges=[]
    d=P[:,1:]!=P[:,:-1]; ii,jj=np.nonzero(d); jj=jj+1
    a=ii*CW+jj; b=(ii+1)*CW+jj; l=P[ii,jj]; r=P[ii,jj-1]
    E1=np.stack([a,b,l,r],1)
    d=P[1:,:]!=P[:-1,:]; ii,jj=np.nonzero(d); ii=ii+1
    a=ii*CW+jj; b=ii*CW+jj+1; l=P[ii-1,jj]; r=P[ii,jj]
    E2=np.stack([a,b,l,r],1)
    E=np.concatenate([E1,E2]).tolist()
    adj=defaultdict(list)
    for e,(a,b,l,r) in enumerate(E): adj[a].append(e); adj[b].append(e)
    vis=bytearray(len(E)); arcs=[]
    def walk(s,e):
        pts=[s]; a,b,l,r=E[e]
        nxt,L,R=(b,l,r) if a==s else (a,r,l)
        vis[e]=1; pts.append(nxt); cur=nxt
        while len(adj[cur])==2 and cur!=s:
            e2=[x for x in adj[cur] if not vis[x]]
            if not e2: break
            e2=e2[0]; a,b,l,r=E[e2]
            nxt=b if a==cur else a
            vis[e2]=1; pts.append(nxt); cur=nxt
        return pts,L,R
    for n,es in adj.items():
        if len(es)==2: continue
        for e in es:
            if not vis[e]: arcs.append(walk(n,e))
    for e in range(len(E)):
        if not vis[e]: arcs.append(walk(E[e][0],e))
    def dp(pts):
        if len(pts)<3: return pts
        keep=[False]*len(pts); keep[0]=keep[-1]=True; st=[(0,len(pts)-1)]
        while st:
            a,b=st.pop()
            if b<=a+1: continue
            ax,ay=pts[a]; bx,by=pts[b]; dx,dy=bx-ax,by-ay; L=dx*dx+dy*dy; md,mi=-1,-1
            for i in range(a+1,b):
                px,py=pts[i]
                if L==0: dd=math.hypot(px-ax,py-ay)
                else:
                    t=max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L)); dd=math.hypot(px-(ax+t*dx),py-(ay+t*dy))
                if dd>md: md,mi=dd,i
            if md>tol: keep[mi]=True; st.append((a,mi)); st.append((mi,b))
        return [p for p,k in zip(pts,keep) if k]
    out=[]; meta=[]
    for pts,l,r in arcs:
        xy=[(n%CW-1, n//CW-1) for n in pts]
        if pts[0]==pts[-1] and len(xy)>3:
            m=len(xy)//2; xy=dp(xy[:m+1])+dp(xy[m:])[1:]
        else: xy=dp(xy)
        out.append(xy); meta.append((int(l),int(r),pts[0],pts[-1]))
    starts=defaultdict(list)
    for k,(l,r,a,b) in enumerate(meta):
        starts[(l,a)].append((k,1)); starts[(r,b)].append((k,-1))
    used=set(); rings=defaultdict(list)
    for k,(l,r,a,b) in enumerate(meta):
        for reg,dirn in ((l,1),(r,-1)):
            if reg==-2 or (k,dirn) in used: continue
            ring=[]; cur=(k,dirn); s=a if dirn==1 else b
            while True:
                used.add(cur); ring.append(cur[0] if cur[1]==1 else ~cur[0])
                end=meta[cur[0]][3] if cur[1]==1 else meta[cur[0]][2]
                if end==s: break
                c=[x for x in starts[(reg,end)] if x not in used]
                if not c: break
                cur=c[0]
            rings[reg].append(ring)
    enc=[]
    for xy in out:
        px,py=xy[0]; row=[px,py]
        for x,y in xy[1:]: row+= [x-px,y-py]; px,py=x,y
        enc.append(row)
    return enc,[[l,r] for l,r,_,_ in meta],{int(k):v for k,v in rings.items()}
