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
      $scope.PDF = undefined;

      // Semantic-UI moves modal content into a dimmer at the top level.
      // While this is usually nice, it means that with our routing will generate
      // multiple modals if you change state. Kill the top level dimmer node on initial load
      // to prevent this.
      $('.ui.dimmer').remove();
      // Populate the size of the modal for when it appears, with an arbitrary user.
      $scope.selectedUser = {};
      $scope.selectedUser.hasPDF = false; // set default to false
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

      // A check functions to see if user has a PDF 
      $scope.checkPDF = function(user) {
        if ($scope.hasPDF == true) {
          return true;
        }
        else {
          var name = user.profile.name.replace(/\s/g, "").toLowerCase();
          UserService.hasFile(name).then(response => {
            $scope.selectedUser.hasPDF = true;
            return true;

          }, error => {
            $scope.hasPDF = false;
            return false;
          })
        }
      }

      // retrieve and open the pdf in a new PDF
      $scope.openPDF = function(user) {
        if ($scope.PDF == undefined) {
      var name = user.profile.name.replace(/\s/g, "").toLowerCase();
        UserService.getFile(name).then(response => {
          if (response.status == 200) {
            $scope.hasPDF = true;
            $scope.PDF = response.data;

            // open in new window
            var newBlob = new Blob([response.data], {type : "application/pdf"});
            const data = window.URL.createObjectURL(newBlob);
            window.open(data, '_blank');
            
          }
          else {
            // If button is clicked although no file exists -- shouldn't be possible because of ng-if
            swal("Doesn't exist", "There is no PDF file for this user", "error");
          }
        })
        }
        if ($scope.hasPDF && $scope.PDF != undefined) {

        var newBlob = new Blob([$scope.PDF], {type : "application/pdf"});
        const data = window.URL.createObjectURL(newBlob);
        window.open(data, '_blank');
            
      }

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
        $scope.selectedUser.hasPDF = $scope.checkPDF(user); // request if user has PDF to update status
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
              },
            ]
          },{
            name: 'Confirmation',
            fields: [
              {
                name: 'Dietary Restrictions',
                value: user.confirmation.dietaryRestrictions.join(', ')
              },{
                name: 'Shirt Size',
                value: user.confirmation.shirtSize
              },{
                name: 'Website',
                value: user.confirmation.website
              }
            ]
          },
          // {
          //   name: 'Travel',
          //   fields: [
          //     {
          //       name: 'Needs Reimbursement',
          //       value: user.confirmation.needsReimbursement,
          //       type: 'boolean'
          //     },{
          //       name: 'Received Reimbursement',
          //       value: user.confirmation.needsReimbursement && user.status.reimbursementGiven
          //     },{
          //       name: 'Address',
          //       value: user.confirmation.address ? [
          //         user.confirmation.address.line1,
          //         user.confirmation.address.line2,
          //         user.confirmation.address.city,
          //         ',',
          //         user.confirmation.address.state,
          //         user.confirmation.address.zip,
          //         ',',
          //         user.confirmation.address.country,
          //       ].join(' ') : ''
          //     },{
          //       name: 'Additional Notes',
          //       value: user.confirmation.notes
          //     }
          //   ]
          // },
          {
            name: 'Other',
            fields: [
              {
                name: 'Additional Notes',
                value: user.confirmation.notes
              }
            ]
          }
        ];
      }

      $scope.selectUser = selectUser;

    }]);
