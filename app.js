const express=require("express");  //express is required to create the server
const app= express();        //binds the express module to 'app'
const path = require('path'); //path is required to read the local path
const fs = require('fs'); //fs is required to read the local files
const https = require('https'); //https is required for the safari and edge browsers
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');  //To parse the web page body
const flash = require('express-flash'); //To give the notification
const session = require('express-session');
const multer = require('multer');
const upload = multer();
const Noty = require('Noty'); //To give seamless notifications
const csvParser = require('csv-parser'); //To parse the CSV files
const io = require('socket.io') (https);
const axios = require('axios');
var iconv = require('iconv-lite');  //To read and display UTF-8 text from CSV


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
//app.use(upload.single('data'));
//app.use(upload.array());

//import the database connectivity file\
var mydb = require('./public/js/database');
//var startCamera = require('./public/js/sendVideo');

//Need to create a SSL private key and certificate for https
var privateKey  = fs.readFileSync('privateKey.pem', 'utf8');
var certificate = fs.readFileSync('certificate.pem', 'utf8');

//Use key and certificate
var credentials = {privateKey: privateKey, certificate: certificate};

//access the public folder
app.use(express.static('public'));

/*Create a https server*/
var httpsServer = https.createServer
({
    key: privateKey,
    cert: certificate,
    ciphers: [
        "ECDHE-RSA-AES128-SHA256",
        "DHE-RSA-AES128-SHA256",
        "AES128-GCM-SHA256",
        "RC4",
        "HIGH",
        "!MD5",
        "!aNULL"
    ].join(':'),
}, app);

httpsServer.listen(3000, function(){
        console.log("HTTPS SERVER STARTED ON localhost:80");     
})

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/pages/home.html'));
});

app.get('/aboutus', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/pages/aboutus.html'));
});

app.get('/dataCollection', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/pages/userDetails.html'));
});

app.post('/', async function(req, res, next) {
  //Get the data from html form
  var gender = req.body.gender;
  var agegroup = req.body.age;
  var qualification = req.body.qualification;
  var isKannada = req.body.isKannada;
  var username = req.body.username;

  //SQL query to insert the data into the datbase
  var sql = `INSERT INTO userdata (gender, ageGroup, qualification, isKannada, speakerID) VALUES ('${gender}', '${agegroup}', '${qualification}', '${isKannada}', '${username}');`;
  
  await mydb.query(sql, function(err, result) {
    if(err)
    {
      err = new Error('SpeakerID is already taken');
      console.error(err);
      res.sendFile(path.join(__dirname, 'public/pages/userDetails.html'));
    }
    console.log('record inserted successfully.');
    //req.flash('success', 'Data added successfully!');
    console.log(req.body);
  });

  //create a folder with the given user name
  await fs.mkdir(path.join('./public/recordings', username), (err) => {
    if (err)
    {
        res.sendFile(path.join(__dirname, 'public/pages/home.html'));
        return console.error(err);
    }
    else
    {
      var newPath = './public/recordings/'+username;
      console.log(newPath);
      var i=1;

      while(i<=7)
      {
        var sub = i.toString();
        console.log(sub);
        fs.mkdir(path.join(newPath, sub), (err) =>
        {
          if(err)
          {
            res.sendFile(path.join(__dirname, 'public/pages/home.html'));
            return console.error(err);
          }
          else
          {
            console.log('Sub directory for session created successfully!');
          }           
        });
        i++;
      }
       fs.mkdir(path.join(newPath, 'demo'), (err) =>
        {
          if(err)
          {
            res.sendFile(path.join(__dirname, 'public/pages/home.html'));
            return console.error(err);
          }
          else
          {
            console.log('Sub directory for demo recording created successfully!');
          }           
        });
        fs.mkdir(path.join(newPath, 'continuous'), (err) =>
        {
          if(err)
          {
            res.sendFile(path.join(__dirname, 'public/pages/home.html'));
            return console.error(err);
          }
          else
          {
            console.log('Sub directory for continuous recording created successfully!');
          }           
        });
      console.log(newPath);
      console.log('Directory created successfully!');
      res.redirect('back');   
    }
  });
});

app.get('/recordData', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/pages/dataCollection.html'));
});

app.post('/uploadDemo', upload.single('demoStream'), async function(req, res, next)
{
  const file = req.file;
  var sID = req.body.userName;
  console.log('Received Username for demo recording: '+sID);
  console.log(file);
  if(!file)
  {
    const err = new Error('Please upload a file');
    err.httpStatusCode = 400;
    return next(err);
  }
  var filePath = '/public/recordings/'+sID+'/'+'demo/';
  let uploadLocation = __dirname + filePath + req.file.originalname // where to save the file to. make sure the incoming name has a .wav extension

  fs.writeFileSync(uploadLocation, Buffer.from(new Uint8Array(req.file.buffer))); // write the blob to the server as a file
  res.sendStatus(200);
})

app.post('/uploadMain', upload.single('newVideo'), async function(req, res)
{
  const file = req.file;
  var fileName = file.originalname + 'mp3';
  var sID = req.body.userName;
  var secID = req.body.section;
  console.log('secNo: '+secID);
  console.log(file, req.body);
  if(!file)
  {
    const err = new Error('Please upload a file');
    err.httpStatusCode = 400;
    return next(err);
  }
  let uPath = '/public/recordings/'+sID+'/'+secID+'/';
  console.log(uPath);
  let uploadLocation = __dirname + uPath + fileName; // where to save the file to. make sure the incoming name has a .wav extension

  fs.writeFileSync(uploadLocation, Buffer.from(new Uint8Array(req.file.buffer))); // write the blob to the server as a file
  res.sendStatus(200);
})

app.post('/uploadCon', upload.single('conStream'), async function(req, res, next)
{
  const file = req.file;
  var sID = req.body.userName;
  console.log('Received Username for continuous recording: '+sID);
  console.log(file);
  if(!file)
  {
    const err = new Error('Please upload a file');
    err.httpStatusCode = 400;
    return next(err);
  }
  var filePath = '/public/recordings/'+sID+'/'+'continuous/';
  let uploadLocation = __dirname + filePath + req.file.originalname // where to save the file to. make sure the incoming name has a .wav extension

  fs.writeFileSync(uploadLocation, Buffer.from(new Uint8Array(req.file.buffer))); // write the blob to the server as a file
  res.sendStatus(200);
})


app.get('/contactus', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/pages/contactus.html'));
});

let ddata ={};
app.post('/testing', async function(req, res) {
  var speakerID = req.body.user;
  var sessionID = req.body.ele;
  var audioCount = req.body.rec;
  var sentence = req.body.sentence1;
  var results = [];
  console.log('Data from Browser: ' + req.body);
  console.log('First: Data in the ddata:' +ddata);
  console.log(speakerID + '_' + sessionID + '_' + audioCount);

  var sql = `SELECT speakerID from userdata where speakerID='${speakerID}'`;

    mydb.query(sql, async function(err, result)
    {
      if(err) //if sql query is not executed becaus of any reason
      {
        throw err;
        console.log(err);
      }
      if(result.length > 0)  //if at least one row is returned by sql query
      {
        //in this case, exact one row will be returned
        console.log('**********User Found**********');
        console.log('This is the result:' + result);
        
        //Start recording 100 sentences and download them in a selected folder
        let myPromise = new Promise(function(myResolve, myReject){
          fs.createReadStream('./public/data/kannada1.csv')
          .pipe(iconv.decodeStream('utf-8'))
          .pipe(csvParser())
          .on('data', (data) => {
            results.push(data);
          })
          .on('end', async () => {
            results.forEach((item)=>{
              console.log(item);
              ddata[item.ID]=item.Sentence;
            })
          })
        })
        myPromise.then(
          app.get('/testing', function(req, res) {
              return res.json(ddata);
            })
          )   
        }
      else      //if no rows are returned by sql query
      {
        ddata ={};
        console.log('second: Data in the else part: '+ ddata);
        console.log('**********User Not Found**********');
      }
    });
   res.status(204).send();
})

// app.get('/testing', function(req, res) {
//   return res.json(ddata);
// })

let sdata = {};
app.post('/getSentence', async function(req, res) {
  var user = req.body.user;
  var stNum = req.body.sentence;
  
  console.log('User: '+user+' AND '+'Sentence: '+stNum);

  var results = [];
  //res.setHeader("Content-Type", "application/json; charset=utf-8");
  var sql = `SELECT speakerID from userdata where speakerID='${user}'`;
  mydb.query(sql, async function(err, result)
  {
    if(err) //if sql query is not executed becaus of any reason
    {
      throw err;
      console.log(err);
    }
    if(result.length > 0)  //if at least one row is returned by sql query
    {
      //in this case, exact one row will be returned
      console.log('**********User Found**********');
      console.log('This is the result:' + result);
      
      //Start recording 100 sentences and download them in a selected folder
      await fs.createReadStream('./public/data/kannada1.csv')
      .pipe(iconv.decodeStream('UTF-8'))
      .pipe(csvParser())
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', async () => {
        results.forEach((item)=>{
          console.log(item);
          sdata[item.ID]=item.Sentence;
        })
      })
    }
    else      //if no rows are returned by sql query
    {
      sdata = {};
      console.log('User Not Found');
    }
  });
  res.status(204).send();
})

app.get('/getSentence', function(req, res) {
  res.cookie('cookieName', 'cookieValue', { sameSite: 'none', secure: true})
  return res.json(sdata);
})

app.get('/consent', function(req, res) {
  res.sendFile(path.join(__dirname, 'public/pages/consent.html'));
});

let isValidSpeaker = 0;
app.post('/userConsent', function(req, res) {
  var speakerID = req.body.user;
  
  console.log(speakerID);
  var sql = `SELECT speakerID from userdata where speakerID='${speakerID}'`;
  
  mydb.query(sql, async function(err, result)
  {
    if(err) //if sql query is not executed becaus of any reason
    {
      throw err;
      console.log(err);
    }
    if(result.length > 0)  //if at least one row is returned by sql query
    {
      //in this case, exact one row will be returned
      console.log('**********User Found**********');
      console.log('This is the result:' + result);
      isValidSpeaker = 1;
    }
    else      //if no rows are returned by sql query
    {
      console.log('**********User Not Found**********');
      isValidSpeaker = 0;
    }
  });
  res.status(204).send();
});

app.get('/userConsent', function(req, res) {
        return res.json(isValidSpeaker);
})

app.post('/uploadConsent', upload.single('newVideo'), async function(req, res)
{
  const file = req.file;
  var fileName = file.originalname + 'mp4';
  var sID = req.body.userName;
  console.log(file, req.body);
  if(!file)
  {
    const err = new Error('Please upload a file');
    err.httpStatusCode = 400;
    return next(err);
  }
  let uPath = '/public/recordings/'+sID+'/';
  console.log(uPath);
  let uploadLocation = __dirname + uPath + fileName; // where to save the file to. make sure the incoming name has a .wav extension

  fs.writeFileSync(uploadLocation, Buffer.from(new Uint8Array(req.file.buffer))); // write the blob to the server as a file
  res.sendStatus(200);
})


app.post('/getdemoUser', function(req, res) {
  var speakerID = req.body.user;
  console.log('Received Speaker ID for demo recording:'+speakerID);
  var sql = `SELECT speakerID from userdata where speakerID='${speakerID}'`;
  
  mydb.query(sql, async function(err, result)
  {
    if(err) //if sql query is not executed becaus of any reason
    {
      throw err;
      console.log(err);
    }
    if(result.length > 0)  //if at least one row is returned by sql query
    {
      //in this case, exact one row will be returned
      console.log('**********User Found**********');
      console.log('This is the result:' + result);
      isValidSpeaker = 1;
    }
    else      //if no rows are returned by sql query
    {
      console.log('**********User Not Found**********');
      isValidSpeaker = 0;
    }
  });
  res.status(204).send();
});

app.get('/getdemoUser', function(req, res) {
        return res.json(isValidSpeaker);
})

app.post('/getconUser', function(req, res) {
  var speakerID = req.body.user;
  console.log('Received Speaker ID for continuous recording:'+speakerID);
  var sql = `SELECT speakerID from userdata where speakerID='${speakerID}'`;
  
  mydb.query(sql, async function(err, result)
  {
    if(err) //if sql query is not executed becaus of any reason
    {
      throw err;
      console.log(err);
    }
    if(result.length > 0)  //if at least one row is returned by sql query
    {
      //in this case, exact one row will be returned
      console.log('**********User Found**********');
      console.log('This is the result:' + result);
      isValidSpeaker = 1;
    }
    else      //if no rows are returned by sql query
    {
      console.log('**********User Not Found**********');
      isValidSpeaker = 0;
    }
  });
  res.status(204).send();
});

app.get('/getconUser', function(req, res) {
        return res.json(isValidSpeaker);
})

app.post('/savePointer', async function(req, res){
  var dataToWrite = JSON.stringify(req.body.pointer);
  console.log(dataToWrite);
  await fs.writeFile('./public/data/pointer.csv', dataToWrite, 'utf8', function (err) {
    if (err)
    {
      console.log('Some error occured - file either not saved or corrupted file saved.');
    } 
    else
    {
      console.log('It\'s saved!'+dataToWrite);
    }
  });
  res.status(204).send();
})