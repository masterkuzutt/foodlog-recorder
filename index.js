const NDBURL = 'http://api.nal.usda.gov/ndb/';

// api requests
function searchFoodData(searchword,cb,cbNodata){
    $.ajax({
      method: 'GET',
      url: NDBURL + 'search',
      data: {
        format :'json',
        ds : 'Standard Reference',
        q :searchword,
        max : 25,
        offset : 0,
        api_key : NDBAPIKEY
      }
    })
    .done( (data) => {
      if(typeof data.list !== "undefined"){
        data.list.item.forEach (cb);
      }else{
        cbNodata();
      }
    })
    .error();
};

// third value is place to store data
// cb have to accept to arguments.
function getReport(ndbno,cb) {
  $.ajax({
    method: "GET",
    url: NDBURL + 'reports',
    data : {
      ndbno   : ndbno,
      type    : 'b',
      format  : 'json',
      api_key : NDBAPIKEY
    }
  })
  .done( (data) => {
    cb(data);
  })
  .error((data) => {
  });
};

//*********
//strorage functions


function writeStorage(instance,key,data){
  instance.setItem(key,data);
};



function getStorageKey(instance){
  let keys = [];
  for (let i = 0 ; i < window.localStorage.length ;i++){
      keys.push(window.localStorage.key(i));
  }
  return keys;
};


function readStorageData(instance,key,cb){
  let data = instance.getItem(key);
  data.then(cb);
};

function readAllStorageData(instance,cb){
  instance.keys().then((key) =>{
    readStorageData(instance,key,cb);
  });
}

function checkIfStorageData(key,data){

}

function deleteStorageData(instance,key,cb){
  //[TODO] for now, this function update key by tempolary data due to localstorage limitation.
  instance.removeItem(key,cb);
}


class FoodDataModel{
    constructor (){
      this.ndbno = "";
      this.group = "";
      this.name = "";
    }
    set basicData(item){
      this.ndbno  = item.ndbno;
      this.group =  item.group;
      this.name  =  item.name;
      this.nutrtions = [];
    }

    set nutritionData(itemList){
      itemList.forEach((item) => {
        this.nutrtions.push(item)
      });
    }
};


let viewModel = new class {

  constructor(){
    this.searchResult =ko.observableArray([]);
    this.foodData = ko.observableArray([]);
    this.foodRecodeDay = ko.observableArray([]);
    this.foodRecode =ko.observableArray([]);
    this.searchQuery = ko.observable("");
    this.selectedDate = ko.observable(UTIL.getCurrentDate());
    this.foodDataDB = localforage.createInstance({
      name: "foodDataDB"
    });

    this.foodRecodeDB = localforage.createInstance({
      name: "foodRecodeDB"
    });
  }

  init(){
    this.loadFoodData();
    this.loadFoodRecode();
  }

  loadFoodData(){
    this.foodData([]);
    // readStorageData(this.foodDataDB,"foodData",(data) => {
    readAllStorageData(this.foodDataDB,(data) => {
      console.log(data);
      if (data !== null  && data.length > 0){
        data.forEach( (item) => {
          this.foodData.push(item);
        });
      }
    });
  }

  // binds to search Button
  searchFood() {
    this.searchResult([]);

    searchFoodData(this.searchQuery,
      (item)=>{
        this.searchResult.push(this.createTmpFoodData(item));
      },
      () =>{
        this.searchResult.push(this.createTmpFoodData({ndbno:"no recode found"}));
      }
    );
  }


  storeFoodData(item){
    getReport(item.ndbno ,
      (data) => {
          let food = new  FoodDataModel();
          food.basicData = data.report.food;
          //[TODO] data format is defined by model. don't need to care structure of data here

          food.nutritionData = data.report.food.nutrients
          //[TODO] check if data is already exist or not. knockout has suitable method i guess
          // currently just checkup tempolary array on the view. because local storage doesn't have function to store multplue keys
          for (let i = 0 ; i < this.foodData().length ; i++){
            if ( this.foodData()[i].ndbno === food.ndbno ){
              console.log(i,item.ndbno,food.ndbno);
              return;
            }
          }

          this.foodData.push(food);
          writeStorage(this.foodDataDB,food.ndbno,food);
          this.loadFoodData();
      }
    );

  }

  deleteFoodData(item){
    //[TODO] for now, this function update key by tempolary data due to localstorage limitation.
    // this.foodData.remove(item);
    deleteStorageData(this.foodDataDB,item.ndbno,() =>{
      this.loadFoodData();
    });
  }

  createTmpFoodData(item){
    return {
      ndbno:item.ndbno,
      group:item.group || "",
      name: item.name || ""
    }
  }

  //food recode functions
  loadFoodRecode(dateStr){

    let currentDate = dateStr || UTIL.getCurrentDate();
    this.foodRecode([]);
    readStorageData(this.foodRecodeDB,"foodRecode",(data) => {
      if (data !== null  && data.length > 0){
        data.forEach( (item) => {
        if(item.date === currentDate){
          this.foodRecode.push(item);
        }
      });
      }

    });
  }

  searchFoodRecode(){

  }

  storeFoodRecode(item){
    // let today = "2016/09/01";
    item.date = UTIL.getCurrentDate();
    this.foodRecode.push(item);
    writeStorage(this.foodRecodeDB,'foodRecode',this.foodRecode());
  }

  deleteFoodRecode(item){
    //[TODO] for now, this function update key by tempolary data due to localstorage limitation.
    // it delete all the data except for current data on the screen. need update

    console.log(this.foodRecode());
    this.foodRecode.remove(item);
    deleteStorageData(this.foodRecodeDB,'foodRecode',this.foodRecode());
  };

}();

//reporta

ko.applyBindings(viewModel);
viewModel.init();
