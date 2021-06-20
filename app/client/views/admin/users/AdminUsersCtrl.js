const moment = require('moment');
const swal = require('sweetalert');

angular.module('reg')
  .controller('AdminUsersCtrl',[
    '$scope',
    '$state',
    '$stateParams',
    'UserService',
    function($scope, $state, $stateParams, UserService){

      $scope.pages = [];
      $scope.users = [];

      // Semantic-UI moves modal content into a dimmer at the top level.
      // While this is usually nice, it means that with our routing will generate
      // multiple modals if you change state. Kill the top level dimmer node on initial load
      // to prevent this.
      $('.ui.dimmer').remove();
      // Populate the size of the modal for when it appears, with an arbitrary user.
      $scope.selectedUser = {};
      $scope.selectedUser.sections = generateSections({status: '', confirmation: {
        dietaryRestrictions: []
      }, profile: ''});

      function updatePage(data){
        $scope.users = data.users;
        $scope.currentPage = data.page;
        $scope.pageSize = data.size;

        var p = [];
        for (var i = 0; i < data.totalPages; i++){
          p.push(i);
        }
        $scope.pages = p;
      }

      UserService
        .getPage($stateParams.page, $stateParams.size, $stateParams.query)
        .then(response => {
          updatePage(response.data);
        });

      $scope.$watch('queryText', function(queryText){
        UserService
          .getPage($stateParams.page, $stateParams.size, queryText)
          .then(response => {
            updatePage(response.data);
          });
      });

      function traverse(o,func,totalKey) {
          // https://stackoverflow.com/questions/722668/traverse-all-the-nodes-of-a-json-object-tree-with-javascript
          for (var i in o) {
              if(totalKey == "") {
                totalKeyNew = i;
              }
              else {
                totalKeyNew = totalKey +  "." + i;
              }
              if(typeof(o[i]) != "object") {
                  func.apply(this,[i,totalKeyNew,o[i]]);
              }
              if (o[i] !== null && typeof(o[i])=="object") {
                  //going one step down in the object tree!!
                  traverse(o[i],func,totalKeyNew);
              }
          }
      }

      /**
       * Opens a new window with a line-break seperated list of users with 
       *  name, email, verified, submitted, admitted, confirmed
       *  Data can be used as .CSV 
       */
      $scope.getAllMails = function() {
        UserService.getAllUsers().then(response => {
          users = response.data;

          file="";
          titleInserted = false;

          keys = []
          for(user of users) {
            function getKeys(key, totalKey, value) {
              if(totalKey == "status.name") {
                key = "statusName";
              }
              if(!keys.includes(key)) {
                keys.push(key);
              }
            }
            traverse(user, getKeys, "");
          }
          file += keys.join(',') + '\n'

          for(user of users) {
            if (user.verified) {
              valDic = {};
              for(key of keys) {
                valDic[key] = "";
              }
              function addToDic(key, totalKey, value) {
                if(totalKey == "status.name") {
                  key = "statusName";
                }
                valDic[key] = value;
              }
              traverse(user, addToDic, "");

              valStrs = [];
              for(let i = 0; i < keys.length; i++) {
                key = keys[i];
                valStrs.push('"' + valDic[key] + '"');
              }
              file += valStrs.join(',').replace(/(\r\n|\n|\r)/gm, ' ').replace(/"/g, "'") + '\n';
            }
          }

          var newBlob = new Blob([file], {type : "text/csv"});
          const data = window.URL.createObjectURL(newBlob);

          var link = document.createElement("a");
          link.setAttribute("href", data);
          link.setAttribute("download", "users.csv");
          document.body.appendChild(link); // Required for FF

          link.click();
        })
      }



      $scope.goToPage = function(page){
        $state.go('app.admin.users', {
          page: page,
          size: $stateParams.size || 50
        });
      };

      $scope.goUser = function($event, user){
        $event.stopPropagation();

        $state.go('app.admin.user', {
          id: user._id
        });
      };

      $scope.toggleCheckIn = function($event, user, index) {
        $event.stopPropagation();

        if (!user.status.checkedIn){
          swal({
            title: "Whoa, wait a minute!",
            text: "You are about to check in " + user.profile.name + "!",
            icon: "warning",
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              checkIn: {
                className: "danger-button",
                closeModal: false,
                text: "Yes, check them in",
                value: true,
                visible: true
              }
            }
          })
          .then(value => {
            if (!value) {
              return;
            }

            UserService
              .checkIn(user._id)
              .then(response => {
                $scope.users[index] = response.data;
                swal("Accepted", response.data.profile.name + " has been checked in.", "success");
              });
          });
        } else {
          UserService
            .checkOut(user._id)
            .then(response => {
              $scope.users[index] = response.data;
              swal("Accepted", response.data.profile.name + ' has been checked out.', "success");
            });
        }
      };

      $scope.acceptUser = function($event, user, index) {
        $event.stopPropagation();

        console.log(user);

        swal({
          buttons: {
            cancel: {
              text: "Cancel",
              value: null,
              visible: true
            },
            accept: {
              className: "danger-button",
              closeModal: false,
              text: "Yes, accept them",
              value: true,
              visible: true
            }
          },
          dangerMode: true,
          icon: "warning",
          text: "You are about to accept " + user.profile.name + "!",
          title: "Whoa, wait a minute!"
        }).then(value => {
          if (!value) {
            return;
          }

          swal({
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              yes: {
                className: "danger-button",
                closeModal: false,
                text: "Yes, accept this user",
                value: true,
                visible: true
              }
            },
            dangerMode: true,
            title: "Are you sure?",
            text: "Your account will be logged as having accepted this user. " +
              "Remember, this power is a privilege.",
            icon: "warning"
          }).then(value => {
            if (!value) {
              return;
            }

            UserService
              .admitUser(user._id)
              .then(response => {
                $scope.users[index] = response.data;
                swal("Accepted", response.data.profile.name + ' has been admitted.', "success");
              });
          });
        });
      };

      $scope.rejectUser = function($event, user, index) {
        $event.stopPropagation();

        console.log(user);

        swal({
          buttons: {
            cancel: {
              text: "Cancel",
              value: null,
              visible: true
            },
            accept: {
              className: "danger-button",
              closeModal: false,
              text: "Yes, reject them",
              value: true,
              visible: true
            }
          },
          dangerMode: true,
          icon: "warning",
          text: "You are about to reject " + user.profile.name + "!",
          title: "Whoa, wait a minute!"
        }).then(value => {
          if (!value) {
            return;
          }

          swal({
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              yes: {
                className: "danger-button",
                closeModal: false,
                text: "Yes, reject this user",
                value: true,
                visible: true
              }
            },
            dangerMode: true,
            title: "Are you sure?",
            text: "Your account will be logged as having rejected this user. " +
              "Remember, this power is a privilege.",
            icon: "warning"
          }).then(value => {
            if (!value) {
              return;
            }

            UserService
              .rejectUser(user._id)
              .then(response => {
                $scope.users[index] = response.data;
                swal("Accepted", response.data.profile.name + ' has been rejected.', "success");
              });
          });
        });
      }

      $scope.toggleAdmin = function($event, user, index) {
        $event.stopPropagation();

        if (!user.admin){
          swal({
            title: "Whoa, wait a minute!",
            text: "You are about make " + user.profile.name + " an admin!",
            icon: "warning",
            buttons: {
              cancel: {
                text: "Cancel",
                value: null,
                visible: true
              },
              confirm: {
                text: "Yes, make them an admin",
                className: "danger-button",
                closeModal: false,
                value: true,
                visible: true
              }
            }
          }).then(value => {
            if (!value) {
              return;
            }

            UserService
              .makeAdmin(user._id)
              .then(response => {
                $scope.users[index] = response.data;
                swal("Made", response.data.profile.name + ' an admin.', "success");
              });
            }
          );
        } else {
          UserService
            .removeAdmin(user._id)
            .then(response => {
              $scope.users[index] = response.data;
              swal("Removed", response.data.profile.name + ' as admin', "success");
            });
        }
      };

      function formatTime(time){
        if (time) {
          return moment(time).format('MMMM Do YYYY, h:mm:ss a');
        }
      }

      $scope.rowClass = function(user) {
        if (user.admin){
          return 'admin';
        }
        if (user.status.confirmed) {
          return 'positive';
        }
        if (user.status.admitted && !user.status.confirmed) {
          return 'warning';
        }
      };

      function selectUser(user){
        $scope.selectedUser = user;
        $scope.selectedUser.sections = generateSections(user);
        $('.long.user.modal')
          .modal('show');
      }

      function generateSections(user){
        return [
          {
            name: 'Basic Info',
            fields: [
              {
                name: 'Created On',
                value: formatTime(user.timestamp)
              },{
                name: 'Last Updated',
                value: formatTime(user.lastUpdated)
              },{
                name: 'Confirm By',
                value: formatTime(user.status.confirmBy) || 'N/A'
              },{
                name: 'Checked In',
                value: formatTime(user.status.checkInTime) || 'N/A'
              },{
                name: 'Email',
                value: user.email
              },{
                name: 'Team',
                value: user.teamCode || 'None'
              }
            ]
          },{
            name: 'Profile',
            fields: [
              {
                name: 'Name',
                value: user.profile.name
              },{
                name: 'Gender',
                value: user.profile.gender
              },{
                name: 'Student',
                value: user.profile.isStudent
              },{
                name: 'School',
                value: user.profile.school
              },{
                name: 'Major',
                value: user.profile.major
              },{
                name: 'Work',
                value: user.profile.work
              },{
                name: 'Location',
                value: user.profile.location
              },{
                name: 'Experience',
                value: user.profile.experience
              },{
                name: 'Description',
                value: user.profile.description
              },{
                name: 'Essay',
                value: user.profile.essay
              },{
                name: 'Github',
                value: user.profile.github
              },{
                name: 'Adult?',
                value: user.profile.adult,
                type: "boolean"
              },{
                name: 'Open Source OK?',
                value: user.profile.openSource,
                type: "boolean"
              },{
                name: 'Data Privacy Accepted?',
                value: user.profile.dataPrivacy,
                type: "boolean"
              },
            ]
          },
           {
             name: 'Survival Kit',
             fields: [
               {
                 name: 'Address',
                 type: "multiline",
                 value: user.confirmation.address ? [
                   user.confirmation.address.name,
                   user.confirmation.address.line1,
                   user.confirmation.address.line2,
                   user.confirmation.address.zip + " " + user.confirmation.address.city,
                   user.confirmation.address.state,
                   user.confirmation.address.country,
                 ] : []
               }
             ]
           },
          {
            name: 'Other',
            fields: [
              {
                name: 'Additional Notes',
                value: user.confirmation.notes,
              }
            ]
          }
        ];
      }

      $scope.selectUser = selectUser;

    }]);
