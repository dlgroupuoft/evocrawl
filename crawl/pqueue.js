// ref: https://stackoverflow.com/questions/42919469/efficient-way-to-implement-priority-queue-in-javascript
const top = 0;
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

export default class PriorityQueue {
//class PriorityQueue{
  constructor(comparator = (a, b) => a > b) {
    this._heap = [];    // contains objects {key, val} where val determines the priority
    this._comparator = comparator;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() == 0;
  }
  peek() {
    return this._heap[top];
  }
  setheap(heap) {
    this._heap = heap;
  }
  push(...values) {
    values.forEach(value => {
    //   console.log(value)
      this._heap.push(value);
      //this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > top) {
      this._swap(top, bottom)
    }
    this._heap.pop();
    this._siftDown();
    return poppedValue;
  }
  shift() {
    const poppedValue = this.peek();
    this._heap.shift();
    return poppedValue;
  }
  replace(value) {
    const replacedValue = this.peek();
    this._heap[top] = value;
    this._siftDown();
    return replacedValue;
  }

  update_val(key, val){
    for(let i = 0; i < this.size() - 1; i ++){
      if(this._heap[i]['key'] == key){
        this._heap[i]['val'] = Number(val);
        this._siftUp();
      }
    }
  }

  _greater(i, j) {
    if(Number(this._heap[i]['val']) > Number(this._heap[j]['val']))
    {
      return true;
    }
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > top && this._greater(node, parent(node))) { //parent(node)
      this._swap(node, parent(node));
      node = parent(node);
    }
  }
  sort(){
    for(let i = 0; i < this.size() - 1; i++)
    {
      for(let j = i + 1; j < this.size(); j++){
        if(this._greater(j, i)){
          this._swap(j, i);
        }
      }
    }
  }
  _siftDown() {
    let node = top;
    while (
      (left(node) < this.size() && this._greater(left(node), node)) ||
      (right(node) < this.size() && this._greater(right(node), node))
    ) {
      let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}

/*let APPNAME = "wordpress";
const DATA_FOLDER = '../data/'+APPNAME+'/';

let USER_MODE = 'a';

const loadfile = function (name, user='a') {
  const fs = require('fs');
      try {
          if(fs.existsSync(DATA_FOLDER+user+'_'+name)){
              console.log(`file ${user+'_'+name} detected.`);
              return JSON.parse(fs.readFileSync(DATA_FOLDER+user+'_'+name));
          }            
      } catch (err) {
          console.log(`error loading file - ${DATA_FOLDER+user+'_'+name}`)
          console.log(err);
      }
      console.error(`file ${user+'_'+name} not found`);
      return false
}

const printObject = function(obj, name) {
  const fs = require('fs');
  fs.writeFileSync(DATA_FOLDER+USER_MODE+'_'+name, JSON.stringify(obj, null, 2) , 'utf-8');
}

var pqueue = new PriorityQueue();

temp_pq = loadfile('pqueue.json');

pqueue.setheap(temp_pq._heap);

pqueue.push({
  "key": "http://10.99.0.199/index.php/2022/03/27/hello-world/#comment-55",
  "val": "9"
});


printObject(pqueue, 'pqueue.json')*/