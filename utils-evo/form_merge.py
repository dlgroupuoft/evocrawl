import os
import time
import json
import sys
APPNAME = sys.argv[1]
DATA_FOLDER = "../data/" + APPNAME + "/"
EV_SEED_FOLDER = DATA_FOLDER + "ev_seed/"
EV_LOG_FOLDER = DATA_FOLDER + "ev_log/"
SEED_FOLDER = DATA_FOLDER + "seed/"
LOG_FOLDER = DATA_FOLDER + "log/"

def load_file(folder, name):
    try:
        with open(folder + 'a_' + name, 'r') as f:
            data = json.load(f)
        return data
    except:
        return False
    
def write_file(folder, name, data):
    try:
        with open(folder + 'a_' + name, 'w') as f:
            json.dump(data, f, indent=4)
    except:
        print("failed to write to file")
        return False

def merge_list(dst_list=[], src_list=[]):
    result_list = dst_list
    for item_src in src_list:
        result = 0
        for item_dst in dst_list:
            if item_src == item_dst:
                result = 1
                break
        if result == 0:
            result_list.append(item_src)
    return dst_list
    
if __name__ == '__main__':
    sim_log = load_file(DATA_FOLDER, 'success_forms.json')
    ev_log = load_file(DATA_FOLDER, 'ev_success_forms.json')
    log = {"html": [], "url": []}
    if sim_log != False:
        log["html"] = sim_log["html"]
        log["url"] = sim_log["url"]
    if ev_log != False:
        log["html"] = merge_list(log["html"], ev_log["html"])
        log["url"] = merge_list(log["url"], ev_log["url"])
    write_file(DATA_FOLDER, "success_log.json", log)
