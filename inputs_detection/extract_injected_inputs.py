import re
import os
import sys
import json
import time

successful_injections = dict()
appname = ["wordpress", "drupal", "kanboard", "humhub", "hotcrp", "phpbb", "opencart", "dokuwiki", "impresscms"]
folder_name = sys.argv[1]
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

def process_file():
    with open(folder_name + '/log.txt', errors='ignore') as f:
        lines = f.readlines()
        for line in lines:
            #process_line(line, "fuzz")
            for app in appname:
                search_load_sim = "s" + app[0:2]
                search_load_evo = "e" + app[0:2]
                process_line(line, search_load_sim)
                process_line(line, search_load_evo)

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
while(1):
    flag = load_file(folder_name + "/", "flag.json")
    if not flag['status'] == 'waiting':
        #print('waiting')
        time.sleep(1)
        continue
    print('start extraction')
    os.system('sh c_insert.sh')
    temp_injections = load_file(folder_name + "/", "insertions.json")
    if temp_injections != False:
        successful_injections = temp_injections
    process_file()
    write_file(folder_name + '/', "insertions" + ".json", successful_injections)
    flag['status'] = 'done'
    write_file(folder_name + '/', "flag.json", flag)
    print('done extraction')
