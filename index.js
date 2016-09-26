const NDBURL = 'http://api.nal.usda.gov/ndb/';

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
  .done( function(data) {
    cb(data);
  })
  .error(function(data) {
  });
};

//strorage functions
function writeStorage(key,data){
  window.localStorage.setItem(key,JSON.stringify(data));
};

function getStorageKey(){
  let keys = [];
  for (let i = 0 ; i < window.localStorage.length ;i++){
      keys.push(window.localStorage.key(i));
  }
  return keys;
};

function readStorageData(key){
  return JSON.parse( window.localStorage.getItem(key));
};


let viewModel = new class {

  constructor(){
    this.searchResult =ko.observableArray([]);
    this.foodData = ko.observableArray([]);
    this.dailyRecode =ko.observableArray([]);
  }

  init(){
    this.loadFoodData();
    this.loadFoodRecode();

  }

  loadFoodData(){
    let key = "foodData";
    let data = readStorageData(key);
    console.log(data);
    // data.forEach( (data) => {
    //   this.foodData.push(data);
    // });
  }

  loadFoodRecode(){
  }

  // binds to search Button
  searchFood() {
    this.searchResult([]);
    let searchWord = ($('#search-food-text').val());

    searchFoodData(searchWord,
      (item)=>{
        this.searchResult.push(this.createTmpFoodData(item));
      },
      () =>{
        this.searchResult.push(this.createTmpFoodData({ndbno:"no recode found"}));
      }
    );
  }

  createTmpFoodData(item){
    return {
      ndbno:item.ndbno,
      group:item.group || "",
      name: item.name || ""
    }
  }

  storeFoodData(item){

    getReport(item.ndbno , (data) => {

      let food = new  FoodDataModel();
      food.basicData = data.report.food;
      food.nutritionData = data.report.food.nutrients
      this.foodData.push(food);

      writeStorage("foodData",foodData);

    });
  }

  storeFoodRecode(item){
    // let today = "2016/09/01";
    item.date = '2016/09/09'
    this.foodRecode.push(item);
    writeStorage('foodRecode',JSON.stringify(this.foodRecode));
  }

}();

//reporta

ko.applyBindings(viewModel);
viewModel.init();
