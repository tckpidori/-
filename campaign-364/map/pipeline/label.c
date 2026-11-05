#include <stdio.h>
#include <stdlib.h>
int main(int argc,char**argv){ int W=atoi(argv[1]),H=atoi(argv[2]); size_t N=(size_t)W*H;
 unsigned char*m=malloc(N); fread(m,1,N,stdin); int*lab=malloc(N*sizeof(int)); for(size_t k=0;k<N;k++) lab[k]=-1;
 int*q=malloc(N*sizeof(int)); int cur=0;
 for(size_t s=0;s<N;s++){ if(!m[s]||lab[s]>=0) continue; int qh=0,qt=0; q[qt++]=s; lab[s]=cur;
   while(qh<qt){ int k=q[qh++]; int i=k/W,j=k%W; int nb[4]={ i>0?k-W:-1, i<H-1?k+W:-1, j>0?k-1:-1, j<W-1?k+1:-1 };
     for(int t=0;t<4;t++){ int n=nb[t]; if(n>=0&&m[n]&&lab[n]<0){ lab[n]=cur; q[qt++]=n; } } }
   cur++; }
 fwrite(lab,sizeof(int),N,stdout); fprintf(stderr,"%d components\n",cur); return 0; }
