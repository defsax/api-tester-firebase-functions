const functions = require("firebase-functions");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

// The Firebase Admin SDK to access Firestore.
const admin = require("firebase-admin");
const { firestore } = require("firebase-admin");
admin.initializeApp();
const database = admin.firestore();

const apis = [
  // OTHER
  { get: "https://kennedy-dev1.gojitech.systems/api/v1/status" },

  // USER
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/check/05198f71-cb6e-41cf-a64a-5657e9f89889",
  },

  // AUTH
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/login" },
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/login" },

  // OSCAR REST APIS
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscarrest/providers" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscarrest/notes/1" },
  {
    post: "http://kennedy-dev1.gojitech.systems/api/v1/oscarrest/prescription",
  },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscarrest/patients" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscarrest/auth" },

  // PROVIDERS
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/providers/me" },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/providers/timeslots",
  },

  // AUDIOS
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/audios" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/audios/all" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/listwavfile" },
  {
    delete:
      "http://kennedy-dev1.gojitech.systems/api/v1/audios/05198f71-cb6e-41cf-a64a-5657e9f89889",
  },

  // PRESCRIPTION
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/prescriptions" },

  // DRUGS
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/drugs/search" },

  // PATIENTS
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients" },
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/all" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/1" },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/14/allergies",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/14/measurements",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/14/documents",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/14/forms",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/14/forms/completedEncounterForms",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/14/formOptions",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/patients/14/labResults",
  },

  // TRANSCRIPTION
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/transcriptions?email=test%40gmail.com",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/transcriptions/2f0349ea-8559-4f75-9198-8e2314e29da4",
  },
  {
    delete:
      "http://kennedy-dev1.gojitech.systems/api/v1/transcriptions/2f0349ea-8559-4f75-9198-8e2314e29da4",
  },
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/record" },
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/test/inputtext" },
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/record/drug" },

  // Clinicians
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/clinicians" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/clinicians" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/clinicians/all" },
  {
    put: "http://kennedy-dev1.gojitech.systems/api/v1/clinicians/05198f71-cb6e-41cf-a64a-5657e9f89889",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/clinicians/05198f71-cb6e-41cf-a64a-5657e9f89889",
  },
  {
    delete:
      "http://kennedy-dev1.gojitech.systems/api/v1/clinicians/05198f71-cb6e-41cf-a64a-5657e9f89889",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/providers/05198f71-cb6e-41cf-a64a-5657e9f89889",
  },

  // Notes
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/notes" },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/notes?demographicNo=1",
  },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/notes/1" },

  // Appointments
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/appointments" },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/appointments?demographicNo=14&appointmentDate=2021-07-30",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/appointments/14/history",
  },
  {
    delete: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/appointments/14",
  },
  { put: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/appointments/14" },

  // Templates
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/templates" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/templates" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/template/id/123456" },
  { delete: "http://kennedy-dev1.gojitech.systems/api/v1/template/id/123456" },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/template/name/123456" },
  {
    delete: "http://kennedy-dev1.gojitech.systems/api/v1/template/name/1231123",
  },
  { put: "http://kennedy-dev1.gojitech.systems/api/v1/template/123456" },

  // Soap Notes
  { post: "http://kennedy-dev1.gojitech.systems/api/v1/soapnotes" },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/soapnotes?patientId=93413",
  },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/soapnotes/123456789" },
  { delete: "http://kennedy-dev1.gojitech.systems/api/v1/soapnotes/123456789" },
  { put: "http://kennedy-dev1.gojitech.systems/api/v1/soapnotes/123456789" },

  // Oscar Forms
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/forms/allEncounterForms",
  },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/forms/selectedEncounterForms",
  },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/forms/formGroups" },
  {
    get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/forms/favouriteFormGroup",
  },
  { get: "http://kennedy-dev1.gojitech.systems/api/v1/oscar/forms/groupNames" },
];

const createResult = function (response) {
  return {
    // id
    id: uuidv4(),
    // timestamp
    timestamp: firestore.Timestamp.now(),
    // endpoint URL
    endpointURL: response.config.url,
    // api type (dev/staging/production) -> to begin with, everything is dev
    apiType: "dev",
    // status
    status: response.status,
    // data
    // data: response.data,
  };
};

exports.scheduledFunction = functions.pubsub
  .schedule("0 * * * *")
  .onRun((context) => {
    console.log("This should run every 12 hours!");
    const newID = uuidv4();
    const newEntry = database.collection("test-results").doc(newID);
    const promises = [];
    let count = 0;

    // let userID;
    const jwt = require("jsonwebtoken");
    const signintoken = jwt.sign(
      {
        email: functions.config().kennedy.email,
        name: functions.config().kennedy.name,
      },
      "secretsignin"
    );

    const newLogin = new Promise((resolve, reject) => {
      axios
        .post("http://kennedy-dev1.gojitech.systems/api/v1/login", {
          token: signintoken,
          providerNo: functions.config().kennedy.providerno,
        })
        .then((res) => {
          // userID = res.data.profile.userID;
          const accessToken = res.data.profile.jwt;

          const auth = {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          };

          resolve(auth);
        })
        .catch((err) => {
          // reject(err);
        });
    });

    newLogin.then((auth) => {
      return axios
        .post(
          "http://kennedy-dev1.gojitech.systems/api/v1/oscar/login",
          {
            userName: functions.config().kennedy.name,
            password: functions.config().kennedy.password,
            pin: functions.config().kennedy.pin,
          },
          auth // auth token
        )
        .then((res) => {
          console.log("logged into oscar:", res);
          newEntry
            .set({
              id: uuidv4(),
              timestamp: firestore.Timestamp.now(),
              results: [],
            })
            .then(() => {
              console.log("Document data set succussfully.");
              const batch = database.batch();

              apis.forEach((api) => {
                // console.log("object key:", Object.keys(api));
                if (Object.keys(api)[0] === "get") {
                  // console.log(Object.values(api)[0]);

                  let result = {};

                  promises.push(
                    axios
                      .get(Object.values(api)[0], auth)
                      .then((res) => {
                        result = createResult(res);
                      })
                      .catch((err) => {
                        console.log(err);
                        result = createResult(err.response);
                      })
                      .then(() => {
                        count++;
                        console.log("axios finished.");
                        batch.update(
                          database.collection("test-results").doc(newID),
                          {
                            results: firestore.FieldValue.arrayUnion(result),
                          }
                        );
                      })
                  );
                }
              });

              Promise.allSettled(promises).then((resultstest) => {
                console.log(resultstest);
                console.log(count);
                batch
                  .commit()
                  .then(() => {
                    console.log("batch committed.");
                  })
                  .catch((err) => {
                    console.log(err);
                  });
              });
            })
            .catch((err) => {
              console.log("Error setting new document data:", err);
            });
        });
    });

    return null;
  });
