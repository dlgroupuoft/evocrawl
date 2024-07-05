import json
import sys

target = sys.argv[1]
def load_file(folder, name):
    try:
        with open(folder + name, 'r') as f:
            data = json.load(f)
        return data
    except Exception as e:
        print(e)
        return False
    
def write_file(folder, name, data):
    try:
        with open(folder + name, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(e)
        return False

def parse_texts(form_texts, mode="sim", insertions=[], appname=""):
    success_url = set()
    for form_url in form_texts:
        texts = form_texts[form_url]
        for in_text in insertions:
            if len(in_text) < 6:
                continue
            for log_text in texts:
                if len(log_text) < 6:
                    continue
                if in_text in log_text:
                    success_url.add(form_url)
                    break
    write_file('data/' + appname + '/', mode + "_" + appname + ".json", list(success_url))
    return success_url


sim_texts = load_file('../data/' + target + '/', "a_sim_form_texts" + ".json")
#sim_texts = []
ev_texts = load_file('../data/' + target +  '/', "a_ev_form_texts" + ".json")
inserted_texts = load_file('data/', "a_insertions.json")
#gitlab_inserted_texts = load_file("results/", "a_gitlab.json")
#for key in gitlab_inserted_texts:
#    inserted_texts[key] = gitlab_inserted_texts[key]
mode_sim = "s" + target[0:2]
mode_evo = "e" + target[0:2]
sim_urls = parse_texts(sim_texts, mode_sim, inserted_texts[mode_sim], target)
ev_urls = parse_texts(ev_texts, mode_evo, inserted_texts[mode_evo], target)

for url in sim_urls:
    ev_urls.add(url)

write_file('data/' + target + '/', "all" + "_" + target+ ".json", list(ev_urls))
    
