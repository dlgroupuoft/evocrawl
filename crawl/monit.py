import os
import time
import json
import sys
import argparse

parser = argparse.ArgumentParser(description='Crawler')
parser.add_argument("--APP", help="Web APP to crawl")
parser.add_argument("--MODE", help="XSS or IDOR or privacy")

args = parser.parse_args()

APPNAME = args.APP
MODE = args.MODE

DATA_FOLDER = "../data/" + APPNAME + "/"
EV_SEED_FOLDER = DATA_FOLDER + "ev_seed/"
EV_LOG_FOLDER = DATA_FOLDER + "ev_log/"
SEED_FOLDER = DATA_FOLDER + "seed/"
LOG_FOLDER = DATA_FOLDER + "log/"
ITERATIONS=143 #each ITERATION represent 10 mins
run_command = "./" + MODE + ".sh " + APPNAME
SC_process = "aSC_" + APPNAME
EC_process = "aEC2_" + APPNAME
counter = 0

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
            json.dump(data, f)
    except:
        print("failed to write to file")
        return False

if __name__ == "__main__":
    ev_status = {"generation": 0, "currentpage": ""}
    sim_status = {}
    os.system(run_command)
    ev_prev_url = ""
    ev_prev_gene = 0
    sim_prev_url = ""
    sim_prev_eid = 0
    while(1):
        counter = counter + 1
        time.sleep(600)
        if counter >= ITERATIONS: #set a really large number for bug finding experiments.
            break
        queue = load_file(DATA_FOLDER, "pqueue.json")
        if queue != False:
            queue = queue['_heap']
        sim_queue = load_file(DATA_FOLDER, "queue.json")
        if sim_queue != False:
            sim_queue = sim_queue['_heap']
        if queue != False:
            if len(queue) == 0:
                print("evo queue finished")
            else:
                ev_url = queue[0]['key']
                ev_gene = load_file(DATA_FOLDER, "next_gen.json")
                print("ev: ", ev_url, ": ", ev_gene)
                if ev_url == ev_prev_url and ev_prev_gene == ev_gene:
                    print("evo hangs, restarting")
                    cmd = "pm2 restart " + EC_process
                    os.system(cmd)
                else:
                    ev_prev_url = ev_url
                    ev_prev_gene = ev_gene
        if sim_queue != False:
            if len(sim_queue) == 0:
                print("sim queue finished")
            else:
                sim_seed = sim_queue[0]
                sim_url = sim_seed['key']
                sim_eid = sim_seed['event']
                if sim_eid != "":
                    sim_eid = sim_eid['attr']
                print("sim: ", sim_url, ": ", sim_eid)
                if sim_url == sim_prev_url and sim_eid == sim_prev_eid:
                    print("sim hangs, restarting")
                    cmd = "pm2 restart " + SC_process
                    os.system(cmd)
                else:
                    sim_prev_url = sim_url
                    sim_prev_eid = sim_eid
    stop = "pm2 stop " + EC_process
    os.system(stop)
    stop2 = "pm2 stop " + SC_process
    os.system(stop2)
    ev_cache = load_file(DATA_FOLDER, "ev_crawler_cache.json")
    ev_cache["stat"] = "finished"
    write_file(DATA_FOLDER, "ev_crawler_cache.json", ev_cache)
    sim_cache = load_file(DATA_FOLDER, "sim_crawler_cache.json")
    sim_cache["stat"] = "finished"
    write_file(DATA_FOLDER, "sim_crawler_cache.json", sim_cache)
    time.sleep(1800)
    #os.system("pm2 stop all")
