const express = require("express");
const expressOasGenerator = require('express-oas-generator');
var cors = require('cors')
const http = require("http");
const socketIO = require("socket.io");
const newUserAccount = require('./routes/account/user/new');
const newOrgAccount = require('./routes/account/org/new');
const getUserAccount = require('./routes/account/user/fetch');
const getOrgAccount = require('./routes/account/org/fetch');
//const orgAudit = require('./routes/audit/org/new');
const updateOrg = require('./routes/account/org/update');
const email = require('./communication/email');
const jwt = require('jsonwebtoken');
const blockstack = require('blockstack');

require('dotenv').config();
const port = process.env.REACT_APP_SERVER || 5000;

const app = express();
expressOasGenerator.init(app, {
  info: {
    title: "Graphite Pro API", 
    version: "0.1.0",
    description: "Rest API available for all Graphite Pro customers"
  }
});
const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

//Posts

/*User*/
app.post('/account/user', async (req, res, next) => {
  const headers = req.headers;
  const decoded = jwt.decode(headers.authorization);
  const pubKey = req.body.pubKey;
  //At some point, need to check for API Key vs Bearer Token
  if(req.body) {
    let updateTeam = false;
    try { 
      if(req.query.updateTeam === 'true') {
        updateTeam = true;
      } 
      const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
      if(verify) {
        const payload = {
          data: req.body,
          token: decoded
        }
        //First we check if the user exists already
        let fetchData;
        let fetchUser;
        if(req.body.username !==null) {
          fetchData = {
            orgId: req.body.orgId,
            username: req.body.usernam
          }
          fetchUser = await getUserAccount.fetchUser(fetchData);
        } else {
          fetchData = {
            orgId: req.body.orgId,
            id: req.body.id
          }
          fetchUser = await getUserAccount.fetchUserById(fetchData);
        }
        let userAccount;
        let teamData;
        if(fetchUser.message === "No user found") {
          userAccount = await newUserAccount.postNewUser(payload);
          if(updateTeam === true) {
            teamData = await newUserAccount.postToTeam(payload);
            res.send(teamData);
          } else {
            res.send(userAccount);
          }
        } else {
          if(updateTeam === true) {
            teamData = await newUserAccount.postToTeam(payload);
            res.send(teamData);
          } else {
            res.send(userAccount);
          }
        }
      } else {
        res.send({data: "Invalid token"})
      }
    } catch(err) {
      console.log(err)
      res.send(err);
    }
  } else {
    res.send("Error")
  }
})

/*Org*/
app.post('/account/org', async (req, res, next) => {
  const headers = req.headers;
  const decoded = jwt.decode(headers.authorization);
  const pubKey = req.body.pubKey;
  //At some point, need to check for API Key vs Bearer Token
  if(req.body) {
    try { 
      const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
      if(verify) {
        const submissionData = req.body;
        const newOrg = await newOrgAccount.postSignUp(submissionData, decoded);
        res.send(newOrg);
      } else {
        res.send({data: "Invalid token"});
      }
    } catch(err) {
      res.send("Invalid Token");
    }
  } else {
    res.send("Error")
  }
})

app.post('/account/org/team', async(req, res, next) => {
  const headers = req.headers;
  const decoded = jwt.decode(headers.authorization);
  const pubKey = req.body.pubKey;
  //At some point, need to check for API Key vs Bearer Token
  if(req.body) {
    try { 
      const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
      if(verify) {
        const submissionData = req.body;
        const team = await updateOrg.postNewTeam(submissionData, decoded);
        res.send(team);
      } else {
        res.send({data: "Invalid token"});
      }
    } catch(err) {
      res.send("Invalid Token");
    }
  } else {
    res.send("Error")
  }
})

/*Emails*/

app.post('/emails/invite', async (req, res, next) => {
  const headers = req.headers;
  const pubKey = req.body.userData.pubKey;
  if(req.body) {
    try { 
      const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
      if(verify) {
        const payload = req.body;
        const invite = await email.sendInviteEmail(payload);
        console.log(invite);
        res.send(invite);
      } else {
        res.send({data: "Invalid token"});
      }
    } catch(err) {
      res.send("Invalid Token");
    }
  } else {
    res.send("Error")
  }
})

/*Audits*/
app.post('/audit/org', async (req, res, next) => {
  
})

app.post('/audit/user', async (req, res, next) => {
  
})

//Gets

/*User*/
app.get('/account/org/:orgId/user/:id', async (req, res, next) => {
  const headers = req.headers;
  const decoded = jwt.decode(headers.authorization);
  if(req.body) {
    try {
      const pubKey = req.query.pubKey;
      const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
      if(verify) {
        //Check if the user requesting data is the same as the target
        if(decoded.claim.username === req.params.id) {
          const payload = {
            username: req.params.id,
            orgId: req.params.orgId
          }
          const userData = await getUserAccount.fetchUser(payload);
          res.send(userData)
        } else {
          //Need admin level or role-specific API key to access other users
          //For now send generic error response
          res.send("To fetch info about other users, please use API Key")
        }
      } else {
        res.send("Invalid Token")
      }
    } catch(err) {
      res.send("Invalid Token")
    }
  } else {
    res.send("No params included");
  }
})

/*Org*/

app.get('/account/org/:id', async (req, res, next) => {
  console.log("here we go")
  const headers = req.headers;
  if(headers.authorization) {
    const decoded = jwt.decode(headers.authorization);
    const username = decoded.claim.username;
    if(req.body) {
      try {
        const pubKey = req.query.pubKey;
        const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
        if(verify) {
          var orgId = req.params.id;
          const orgData = await getOrgAccount.fetchOrg(orgId);
          res.send(orgData);
          //Need to eventually verify this data
          /*******************/
          //const personData = await getUserAccount.fetchUser(username);
          //Need to verify that the user is a member of the org being requested
          // if(personData.data.accountProfile.orgInfo.orgId === req.params.id) {
          //   const orgData = await getOrgAccount.fetchOrg(orgId);
          //   res.send(orgData);
          // } else {
          //   res.status(401);
          //   res.send("Access denied");
          // }
        } else {
          res.send("Invalid Auth Token")
        }
      } catch(err) {
        res.send("Invalid Token");
      }
    } else {
      res.send("No params included");
    }
  } else {
    res.send("Bearer token not supplied");
  }
})

//Puts

/*Org*/
app.put('/account/org/name/:id', async(req, res, next) => {
  const headers = req.headers;
  const decoded = jwt.decode(headers.authorization);
  const pubKey = req.body.pubKey;
  const username = decoded.claim.username;
  //At some point, need to check for API Key vs Bearer Token
  if(req.body) {
    try { 
      const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
      if(verify) {
        const data = req.body;
        const org = await updateOrg.updateOrgName(data, decoded);
        res.send(org);
        //TODO: Need to come back and add in this security layer
        // const personData = await getUserAccount.fetchUser(username);
        // if(personData.data.accountProfile.orgInfo.orgId === req.params.id) {
        //   const data = req.body;
        //   const org = await updateOrg.updateOrgName(data, decoded);
        //   res.send(org);
        // } else {
        //   res.send("Access denied");
        // }
      } else {
        res.send({data: "Token Verification Failed: Invalid token"});
      }
    } catch(err) {
      res.send("Error With Auth Token");
    }
  } else {
    res.send("Error")
  }
})

app.put('/account/org/plan', async(err, res) => {
  if(err) {
    res.send(err);
  } else {
    const headers = req.headers;
    const decoded = jwt.decode(headers.authorization);
    const pubKey = req.body.pubKey;
    //At some point, need to check for API Key vs Bearer Token
    if(req.body) {
      try { 
        const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
        if(verify) {
          const submissionData = req.body;
          const org = await updateOrg.updateOrgPlan(submissionData, decoded);
          res.send(org);
        } else {
          res.send({data: "Invalid token"});
        }
      } catch(err) {
        res.send("Invalid Token");
      }
    } else {
      res.send("Error")
    }
  }
})

app.put('/account/org/team/:id', async(err, res) => {
  if(err) {
    res.send(err);
  } else {
    const headers = req.headers;
    const decoded = jwt.decode(headers.authorization);
    const pubKey = req.body.pubKey;
    //At some point, need to check for API Key vs Bearer Token
    if(req.body) {
      try { 
        const verify = blockstack.verifyProfileToken(headers.authorization, pubKey);
        if(verify) {
          const submissionData = req.body;
          const org = await updateOrg.updateOrgTeams(submissionData, decoded);
          res.send(org);
        } else {
          res.send({data: "Invalid token"});
        }
      } catch(err) {
        res.send("Invalid Token");
      }
    } else {
      res.send("Error")
    }
  }
})

// our server instance
const server = http.createServer(app);

// This creates our socket using the instance of the server
const io = socketIO(server);

// This is what the socket.io syntax is like, we will work this later
io.on("connection", socket => {
  console.log("User connected");
  socket.on("room", room => {
    socket.leave(socket.room);
    socket.join(room);
    // roomName = room;
    socket.on("update content", content => {
      // console.log(content);
      // once we get a 'update content' event from one of our clients, we will send it to the rest of the clients
      // we make use of the socket.emit method again with the argument given to use from the callback function above
      console.log("Updating content...");
      try {
        io.sockets.in(room).emit("update content", content);
      } catch (e) {
        console.log(e);
      }
    });
  });

  // console.log(io.nsps['/'].adapter.rooms)

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(process.env.PORT || 5000, () => console.log(`Listening on port ${port}`));
