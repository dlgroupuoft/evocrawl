import re
import os
import sys
import json
import time

successful_injections = dict()
appname = ["wordpress", "drupal", "kanboard", "humhub", "hotcrp", "phpbb", "opencart", "dokuwiki", "impresscms"]
folder_name = sys.argv[1]
target_app = sys.argv[2]
for app in appname:
    search_load_sim = "s" + app[0:2]
    search_load_evo = "e" + app[0:2]
    successful_injections[search_load_sim] = []
    successful_injections[search_load_evo] = []

def load_file(folder, name):
    try:
        with open(folder + 'a_' + name, 'r') as f:
            data = json.load(f)
        return data
    except:
        print("failed to load file")
        return False


def process_line(line, identifier = "sim"):
    if line:
        line = line.lower()
        #print(line)
        for m in re.finditer(identifier, line):
            end = m.end()
            num = identifier
            while line[end].isnumeric():
                num = num + line[end]
                if(end < len(line) - 1):
                    end = end + 1
                else:
                    break
            if not num in successful_injections[identifier]:
                successful_injections[identifier].append(num)

def match_line(line, inserted_inputs):
    for input in inserted_inputs:
        if input in line:
            return True
    return False

def process_file():
    search_load_sim = "s" + target_app[0:2]
    search_load_evo = "e" + target_app[0:2]
    inserted_inputs = []
    inserted_inputs += successful_injections[search_load_sim][1:]
    inserted_inputs += successful_injections[search_load_evo][1:]
    type_inserts = load_file(folder_name + "/", "type_inserts.json")
    if type_inserts == False:
        type_inserts = dict()
    with open(folder_name + '/log.txt', errors='ignore') as f:
        lines = f.readlines()
        renew = False
        name = ''
        for line in lines:
            if line.startswith("BEGIN"):
                renew = True
            if line.startswith("###"):
                if renew == True:
                    renew = False
                    tmp_list = line.split(" ")
                    name = tmp_list[-1].strip().replace("`", "")
                    if not name in type_inserts:
                        type_inserts[name] = list()
                else:
                    if match_line(line, inserted_inputs):
                        column = line.split("=")[0].split("@")[-1].strip()
                        set_type = set(type_inserts[name])
                        set_type.add(int(column))
                        type_inserts[name] = list(set_type)
    write_file(folder_name + '/', "type_inserts.json", type_inserts)
                

def write_file(folder, name, data):
    try:
        with open(folder + 'a_' + name, 'w') as f:
            json.dump(data, f, indent=4)
    except:
        print("failed to write to file")
        return False


#for file in os.listdir("data2/"):
#    if "binlog" in file and (not "index" in file):
#        filename = "data2/" + file
#        print(filename)
#        command = "mysqlbinlog --base64-output=decode-rows --verbose " + filename + " > data2/log.txt"
#        os.system(command)
flag = dict()
flag['status'] = 'waiting'
write_file(folder_name + '/', "flag.json", flag)
print('start extraction')
temp_injections = load_file(folder_name + "/", "insertions.json")
if temp_injections != False:
    successful_injections = temp_injections
process_file()
