var workingDocumentId = ``;
$(document).ready(function(){
	console.log(`Document ready`);


///▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ In use

	$(`#system-administration-new-button`).on(`click`, function(){
		clearFields();
	});

	$(`#system-administration-save-button`).on(`click`, function(){
		console.log(`save`);
		if($(`#system-adminsitration-username`).val()){
			if(confirm(`Are you sure you want save user: ${$(`#system-adminsitration-username`).val()}?`)){
				var userObject = {
					'_id': workingDocumentId,
					'username':	$(`#system-adminsitration-username`).val(),
					'userPermissions': {
						'system-administration':	$(`#system-administration-system-administration`).is(`:checked`),
						'push-notification-app':	$(`#system-administration-push-notification-app`).is(`:checked`),
						'directory-app':	$(`#system-administration-directory-app`).is(`:checked`),
						'user-management-app':	$(`#system-administration-user-management-app`).is(`:checked`)
					}
				};

				$.ajax({
					url: `system-administration/user-management`,
					dataType: `JSON`,
					data: userObject,
					method: `PATCH`,
					success: (res) => {
						workingDocumentId = res._id;
						if(res.success && res.hasOwnProperty(`newUserName`)){
							prompt(`User Created: ${res.newUserName} \nPassword: ${res.newPassword}\nCopy to clipboard: Ctrl+C, Enter`, `Username: ${res.newUserName} Password: ${res.newPassword}`);
						}
						entrySelect(res._id);
						refreshUserList();
					},
					created: (res) => {
						console.log(`created`);
					},
					error: (err) => {
						alert(`Something went wrong`);
						}
				});
			}
		}
	});

		$(`#system-administration-delete-button`).on(`click`, function(){
			if($(`#system-adminsitration-username`).val() && workingDocumentId.length){
				if(confirm(`Are you sure you want save user: ${$(`#system-adminsitration-username`).val()}?`)){
					$.ajax({
						url: `system-administration/user-management`,
						dataType: `JSON`,
						data: { _id: workingDocumentId },
						method: `DELETE`,
						success: (res) => {
							console.log(res);
							alert(`Deleted user`);
							refreshUserList();
						},
						error: (err) => {
							alert(`Something went wrong`);
							}
					});
				}
			}
		});

///▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ In use


	$(`#system-administration-reset-password`).on(`click`, function(){
		if($(`#system-adminsitration-user-list`).val()){
			if(confirm(`Are you sure you want to reset the password for ` + $(`#system-adminsitration-user-email`).val() + `?`)){
				systemAdministration(`reset-password`, $(`#system-adminsitration-user-list`).val(), null, function(result){
					alert(`New user password: ` + result.data.password);
				});
			}
		}
	});


});

///▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ In use

clearFields = () => {
	workingDocumentId = ``;
	$(`#system-administration-system-administration`).prop(`checked`, false);
	$(`#system-administration-push-notification-app`).prop(`checked`, false);
	$(`#system-administration-directory-app`).prop(`checked`, false);
	$(`#system-administration-user-management-app`).prop(`checked`, false);
	$(`#system-adminsitration-username`).val(``);
}

entrySelect = (entryId) => {
	clearFields();
	workingDocumentId = entryId;
	$.ajax({
		url: `system-administration/user-management`,
		dataType: `JSON`,
		data: { _id: entryId},
		method: `GET`,
		success: (res) => {
			$(`#system-administration-system-administration`).prop(`checked`, res.userPermissions[`system-administration`] || false);
			$(`#system-administration-push-notification-app`).prop(`checked`, res.userPermissions[`push-notification-app`] || false);
			$(`#system-administration-directory-app`).prop(`checked`, res.userPermissions[`directory-app`] || false);
			$(`#system-administration-user-management-app`).prop(`checked`, res.userPermissions[`user-management-app`] || false);
			$(`#system-adminsitration-username`).val(res.username);
			},
		error: (err) => {
			}
	});
}

refreshUserList = () => {
	$.ajax({
		url: `system-administration/user-management`,
		dataType: `JSON`,
		data: { refresh: true},
		method: `GET`,
		success: (res) => {
			console.log(res);
			$(`#account-search-results`).empty();
			res.accountsArray.forEach((account, i) => {
				  	$(`#account-search-results`).append(`<div class="result-entry"><div onclick="entrySelect('${account._id}')">${account.username}</div></div>`);
			});


			},
		error: (err) => {
			if(confirm(`Connection error, or session timeout.\nSelect OK to reload page.`)){
				location.reload();
			}
		}
	});
}

///▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ In use
