var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var SCOPES = ['https://www.googleapis.com/auth/calendar.readonly','https://www.google.com/m8/feeds','https://www.googleapis.com/auth/drive'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
//var TOKEN_PATH = TOKEN_DIR + 'calendar-api-quickstart.json';
var TOKEN_PATH = 'calendar-api-quickstart.json';
var oldevents;


start();
setInterval(function(){start(); }, 1000*60*30);

function start() {
// Load client secrets from a local file.
    fs.readFile('lastevents.txt', function(err,file){
        if (err){
            oldevents = [];
        } else
        {
            //oldevents = JSON.parse(file);
            //console.dir(oldevents);
            //console.log(oldevents[1]);

        }

    });
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Calendar API.
        authorize(JSON.parse(content), gcMain);
    });
}
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {



  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
        //console.log();

    console.log("credentials expire at:",new Date(oauth2Client.credentials.expiry_date));

    if (oauth2Client.credentials.expiry_date-new Date()>60000) {
        console.log("Minutes remaining:"+(oauth2Client.credentials.expiry_date-new Date())/60000);

        callback(oauth2Client);

    }else
    {

        console.log("Access taken expired refreshing access token");
        oauth2Client.refreshAccessToken(function(err, tokens) {
            // your access_token is now refreshed and stored in oauth2Client
            //console.log(err,tokens);
             if (err){
                 console.log("Error getting new access token:",err)

             }else
            console.log("refreshed access token");
            storeToken(oauth2Client.credentials);
            console.log("Auth token remaining minutes valid:"+(oauth2Client.credentials.expiry_date-new Date())/60000);

            callback(oauth2Client);

            // store these new tokens in a safe place (e.g. database)

        });

  //      callback(oauth2Client);

    }

    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param  callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    console.log("inputed code:"+code);
      oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function gcMain(auth) {
    var googleContacts = require('google-contacts-oauth');

    var opts = {
        token: auth.credentials.access_token

    };
    googleContacts(opts, function (err, contactData) {
        if (err){

            console.log('Error - on reading contacts:',err)
        }else
        {
            // ok got the contact data:
            console.log('Number of Contacts received:' +(contactData.length));
            for (var y = 0; y < contactData.length; ++y) {
                console.log(contactData[y])
            }
            //return;
            var calendar = google.calendar('v3');
            x = new Date();
            calendar.events.list({
                auth: auth,
                calendarId: 'primary',
                // added getyear instead of 2015
                timeMin: (new Date(x.getFullYear(),x.getMonth(),x.getDate()-0)).toISOString(), // today
                timeMax: (new Date(x.getFullYear(),x.getMonth(),x.getDate()+45)).toISOString(), // next 45 or so days
                maxResults: 1000,
                singleEvents: true,
                orderBy: 'startTime'
            }, function(err, response) {
                if (err) {
                    console.log('The Calendar API returned an error: ' + err);
                    return;
                }
                var events = response.items;
                events.sort(function(o1,o2){
                    if (o1.start.dateTime > o2.start.dateTime)
                    {return 1;}
                    else if (o1.start.dateTime==o2.start.dateTime)
                    {
                        //same time noew alphabetize
                        if (o1.summary > o2.summary){
                            return 1;
                        } else
                        {return -1;
                        }




                    }
                    else {return -1}





                });




                fs.writeFile("lastevents.txt",JSON.stringify(events),function(err){
                   if (err){console.log("error storeing calendar events:")}else
                   {
                       console.log("Wrote calendar events to local disk.")
                   }


                });
                if (events.length == 0) {
                    console.log('No upcoming events found.');
                } else {

                    var outfile = "Last Updated:" +new Date().toString()+'\r\n';
                    var textDay=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

                    console.log('Events found:',events.length);
                  //  console.log(events[10]);
                    var tempday = new Date(events[0].start.dateTime).getDay();
                    for (var i = 0; i < events.length; i++) {

                        var event = events[i];

                        var start = new Date(event.start.dateTime) || event.start.date;
                        if (tempday != start.getDay())
                        {
                            tempday = start.getDay();
                            outfile = outfile + '\r\n';


                        }
//                        outfile = outfile + '"' + (start.getMonth() + 1) + '/' + start.getDate() + ' ' + start.getHours() + ':' + start.getMinutes() + '-' + end.getHours() + ':' + end.getMinutes() + '",' + textDay[start.getDay()] + ',';
                        //outfile = outfile  + (start.getMonth() + 1) + '/' + start.getDate() + ','+ textDay[start.getDay()] + ',';
                        // added year
                        outfile = outfile  + (start.getMonth() + 1) + '/' + start.getDate() +'/'+start.getFullYear()+ ','+ textDay[start.getDay()] + ',';
                      // outfile = outfile + '=HYPERLINK(\"'+event.htmlLink+'\",\"'+event.summary + '\"),';
                        outfile = outfile + event.summary + ','+event.htmlLink+',';
                        process.stdout.write(".");
                        outfile = outfile+  ((new Date() - new Date(event.updated))/3600000)+',';


                        //  console.log(event.summary);
                        //console.log(start +'-'+ end);

                        if ( typeof event.attendees != 'undefined'){
                            // sort the attendee so facilitorator is last
//                            event.attendees.sort(function(o1,o2){
//                                if (o2.start.dateTime > o2.start.dateTime)
//                                {return -1;}
//
//                            });

                        for (var x = 0; x < (event.attendees.length> 2 ? 3:event.attendees.length); x++) {
                           event.attendees[x].name = event.attendees[x].email;
                            // try to resolve the name from the email
                            for (var y = 0; y < contactData.length; ++y) {

                                if (typeof event != 'undefined' && typeof contactData[y].email != 'undefined' && (event.attendees[x].email.toLowerCase() == contactData[y].email.toLowerCase())) { // match calendar email with contacts email
                                    event.attendees[x].name = contactData[y].name;
//                                    console.log(JSON.stringify(contactData[y]))
                                    process.stdout.write("+");
                                    break;

                                }
                            }
                            if (y == contactData.length-1 && (event.attendees[x].email.toLowerCase() != contactData[y].email.toLowerCase())){
                                console.log('contact not matched:'+event.attendees[x].email+':'+event.summary+'')
                            }

                            //outfile = outfile + event.attendees[x].name + ',' + event.attendees[x].responseStatus + ',';
                        }

                            if (typeof event.attendees[1] == 'undefined'){
                                event.attendees[1] = {};
                                event.attendees[1].name = '';
                                event.attendees[1].responseStatus = '';

                            }
                            if (typeof event.attendees[2] == 'undefined'){
                                event.attendees[2] = {};
                                event.attendees[2].name = '';
                                event.attendees[2].responseStatus = '';

                            }
                        // make the facilitator in position 3
                        if (event.attendees[0].name.indexOf("(Facilitator)") > 0){
                            outfile = outfile + event.attendees[1].name + ',' + event.attendees[1].responseStatus + ',';
                            outfile = outfile + event.attendees[2].name + ',' + event.attendees[2].responseStatus + ',';
                            outfile = outfile + event.attendees[0].name + ',' + event.attendees[0].responseStatus + ',';

                        } else if (event.attendees[1].name.indexOf("(Facilitator)") > 0) {
                            outfile = outfile + event.attendees[0].name + ',' + event.attendees[0].responseStatus + ',';
                            outfile = outfile + event.attendees[2].name + ',' + event.attendees[2].responseStatus + ',';
                            outfile = outfile + event.attendees[1].name + ',' + event.attendees[1].responseStatus + ',';
                        } else if (event.attendees[2].name.indexOf("(Facilitator)") > 0) {
                            outfile = outfile + event.attendees[0].name + ',' + event.attendees[0].responseStatus + ',';
                            outfile = outfile + event.attendees[1].name + ',' + event.attendees[1].responseStatus + ',';
                            outfile = outfile + event.attendees[2].name + ',' + event.attendees[2].responseStatus + ',';
                        } else{
                            outfile = outfile + event.attendees[0].name + ',' + event.attendees[0].responseStatus + ',';
                            outfile = outfile + event.attendees[1].name + ',' + event.attendees[1].responseStatus + ',';
                            if (event.attendees.length > 3){
                                outfile = outfile +',,'  +"And "+(event.attendees.length)+" Others";
                            }

                        }






                    }

                        outfile=outfile+'\r\n'
                    }
                    console.log(":)");

                    var service = google.drive('v2');
//        service.files.insert({
                    service.files.update({
                            auth: auth,
                            fileId:'0ByAeyQIq3nQzVjZQWk9mSk5TWm8',
                            newRevision: true, // store in revision history - maybe turn this off
                            resource: {
                                title: 'Missionary Calendar',
                                mimeType: 'text/csv'
                            },media: {
                                mimeType: 'text/csv',
                                body:outfile
                            }
                        },function(err,response){
                            if (err) {
                                console.log('The file update API returned an error: ' + err);
                                return;
                            }
                            console.log('Wrote file to google drive:'+response.originalFilename,response.fileSize,new Date());
                        }
                    )
                }
            });

        }
    });
}

