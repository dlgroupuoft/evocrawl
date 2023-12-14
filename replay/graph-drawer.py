import matplotlib.pyplot as plt
import json
import os
import seaborn as sns

ratio_pairs = []
ev_ratios = []
sim_ratios = []
diff_ratios = []
pub_ratios = []
APPNAME = os.environ['APPNAME']
DATA_FOLDER = "../data/" + APPNAME + "-ev/"
with open(DATA_FOLDER + "b_sim_private_pages.json") as f:
    private_pages = json.load(f)

with open(DATA_FOLDER + "b_sim_public_pages.json") as f:
    public_pages = json.load(f)

for url in private_pages:
    ratios = private_pages[url]
    if(ratios != 0):
        for pair in ratios:
            ev_ratios.append(pair)

for url in public_pages:
    ratios = public_pages[url]
    if(ratios != 1):
        for val in ratios:
            pub_ratios.append(val)


for i in range(0, len(ev_ratios)):
    ev_ratios[i] = round(ev_ratios[i], 3)

for i in range(0, len(pub_ratios)):
    pub_ratios[i] = round(pub_ratios[i], 3)


plt.hist(ev_ratios, color = 'blue', edgecolor = 'black',
         bins = int(180/5))

sns.distplot(ev_ratios, hist=True, kde=False, 
             bins=int(180/5), color = 'blue',
             hist_kws={'edgecolor':'black'})

plt.hist(pub_ratios, color = 'red', edgecolor = 'black',
         bins = int(180/5))

sns.distplot(pub_ratios, hist=True, kde=False, 
             bins=int(180/5), color = 'blue',
             hist_kws={'edgecolor':'black'})
        
plt.title('similarity ratios')
plt.xlabel('ratio')
plt.ylabel('Freq')
plt.show()