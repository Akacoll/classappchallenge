const csvFilePath = 'input.csv';
const csv = require('fast-csv');
const lh = require('lodash');  
const fs = require('fs');

const PNF = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

function searchStudent(name, arr) {
  var res  = false;
  arr.forEach(elem => {
    if (elem == name){
      res = true;
    }
  });
  return res;
}

function formatEmail(str) {
  //split accordingly to slashes
  var array = lh.split(str,'/');
  returnArray = [];
  array.forEach(element => {
    if(element.slice(-4) == '.com')
        returnArray.push(element);
  });
  if(returnArray.length == 0)
    return null;

  return returnArray;
}

function formatPhone(str) {
  //remove non numeric characters
  str = lh.replace(str,/\D/g,'');
  //check length
  if(str.length < 10){
    return null;
  }
  const number = phoneUtil.parseAndKeepRawInput(str, 'BR');
  if(number){
    //exclude mobile phone numbers with less than 9 digits
    if(number.getNationalNumber().toString()[2] == '9' && number.getNationalNumber().toString().length <= 10)
      return null;
    return ('' + number.getCountryCode() + number.getNationalNumber());
  }
    
}

function formatBoolean(str) {
  if(str == 'yes' || str == '1'){
    return true;
  }
  return false;
}

function formatClasses(str) {
  //remove spaces
  if(str.includes('/'))
    return lh.split(str,'/');
  else
    return lh.split(str,',');
}

function remove_duplicates(arr) {
  var obj = {};
  var ret_arr = [];
  for (var i = 0; i < arr.length; i++) {
      obj[arr[i]] = true;
  }
  for (var key in obj) {
      ret_arr.push(key);
  }
  return ret_arr;
}

var o = [] // store output
var results = [] //store raw values from csv
var names = []
var studentCount = -1
var headers = []
var stream = fs.createReadStream(csvFilePath);
csv
 .fromStream(stream)
  .on('data', (row) => {
    if(row[0] == 'fullname')
      headers = row;
    else
      results.push(row);
  })
  .on('end', () => {
    console.log(results);
    for (var row = 0; row < 4; row++) {
      var i = 0;
      if(searchStudent(results[row][0], names)){
        //Found the student
      }
      else{
        names.push(results[row][0])
        o[++studentCount] = {};
      }
      do{
        var data = '';
        var isBoolean = false;
        console.log(results[row][i])
        //check if it needs to be boolean
        if(headers[i].includes("invisible") ||  headers[i].includes("see_all")){
          data = formatBoolean(results[row][i]);
          isBoolean = true;
        //check if it's email
        }else{
          if(headers[i].includes("email")){
            data = formatEmail(results[row][i]);
          //check if it's phone
          }else if(headers[i].includes("phone")){
            data = formatPhone(results[row][i]);
          //check if it's class
          }else if(headers[i].includes("class")){
            data = formatClasses(results[row][i]);
          }else{
            data = results[row][i];
          }
        }
        if(data || isBoolean)
          if(data.constructor === Array && !(headers[i].includes("phone") || headers[i].includes("email"))){
            var header = "";
            if (headers[i].includes("class")){
              header = "classes";
            }else{
              header = headers[i];
            }
            if(!o[studentCount][header])
              o[studentCount][header] = [];
            data.forEach(element => {
              if(element)
                o[studentCount][header].push(element.trim());
            });
  
            o[studentCount][header] = remove_duplicates(o[studentCount][header]);
          }
          else{
            if (headers[i].includes("invisible") 
            ||  headers[i].includes("see_all")
            ||  headers[i].includes("fullname")
            ||  headers[i].includes("eid")){
              if (!o[studentCount][headers[i]]){
                o[studentCount][headers[i]] = {}
              }
              if (o[studentCount][headers[i]] != true)
                o[studentCount][headers[i]] = data;
            }
            //it's an address
            else{
              if (!o[studentCount]["addresses"])
                o[studentCount]["addresses"] = [];
              if(data.constructor != Array)
                data = Array(data);
              data.forEach(element => {
                var type = "";
                var tags = [];
                if(headers[i].includes("phone")){
                  type = "phone";
                }
                else{
                  type = "email";
                }
                tags = headers[i].substring(5).split(",");
                for (let index = 0; index < tags.length; index++) {
                  tags[index] = tags[index].trim();
                }
                var obj = {
                  "type":type,
                  "tags":tags,
                  "address":element
                }
                var foundAddress = false;
                for (var index = 0; index < o[studentCount]["addresses"].length; index++) {
                  if(o[studentCount]["addresses"][index]["address"] == element){
                    o[studentCount]["addresses"][index]["tags"] = lh.union(o[studentCount]["addresses"][index]["tags"], tags);
                    console.log(o[studentCount]["addresses"][index])
                    foundAddress = true;
                    break;
                  }
                };
                if(!foundAddress){
                  o[studentCount]["addresses"].push(obj);
                  console.log(obj)
                }
              })
            }
          }
        i++;
        //column count
      }while(i < 12)
    }
    
    console.log(o);
    fs.writeFile("./output.json", JSON.stringify(o), function(err) {
      if(err) {
          return console.log(err);
      }
      console.log("The file was saved!");
    }); 
  });
