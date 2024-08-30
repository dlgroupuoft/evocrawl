import json
import sys
DATA_FOLDER = "data/" + sys.argv[1] + "/"
def load_file(folder, name):
    try:
        with open(folder + 'a_' + name, 'r') as f:
            data = json.load(f)
        return data
    except:
        return False
    
sc_config = load_file(DATA_FOLDER, "scconfig.json")
if sc_config == False:
    print("the crawler process does not run properly. Please rerun the start_process.sh script.")
else:
    print("the crawler process is running properly.")