var workingDocumentID;
var deviceGroups = [`test`];

$( document ).ready(() => {
	console.log(`Document Ready`);
	$(`#updateButton`).attr(`disabled`, true);
	$(`#deleteButton`).attr(`disabled`, true);
	$(`#insertButton`).attr(`disabled`, true);
	
	$(`.nav-item`).hover(function () {
		$(`#nav-text`).html($(this).attr(`title`));
	}, ()=>  {
		$(`#nav-text`).text(``);
	});	
	
	
	$(`#sendPushNotification`).click(() =>{
		var jsonDocument = {
			destinationType: $(`#destination-type`).val(),
			destination: $(`#location-context-select`).val().split(`,`),
			notificationTitle: $(`#notificationTitleBox`).val(),
			notificationText: $(`#notificationTextBox`).val(),
			ringType: $(`#ring-tone`).val(),
			ledColor: $(`#led-color`).val(),
			repeatCount: $(`#repeat-count`).val()
		};
		console.log(jsonDocument);
		$.ajax({
			  url: `/pushNotification/notifyfunction`,
			  dataType: `JSON`,
			  data: jsonDocument,
			  method: `POST`,
			  success: (res) => {
				  console.log(res);
				  },
			  error: (err) => {
				  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
					location.reload();
					}
				}
			});
	});
	
	
	
	$(`#updateButton`).click(() =>{
		if(checkData()){
		sanitizeNumbers();
			var contactMethodArray = [];
			$(`.contact-method-entry`).each(function() {
				var contactMethodName = $(this).find(`.contactMethodName`).val().toString();
				contactMethodArray.push( { contactMethodName: contactMethodName, contactMethodNumber: $(this).find(`.contactMethodData`).val().toString() } );
			});
			var jsonDocument = {
				_id : workingDocumentID,
				firstName: encodeURI($(`#firstNameBox`).val()),
				lastName: encodeURI($(`#lastNameBox`).val()),
				contactMethods: contactMethodArray,
				locationContexts: []
			};
			
			$(`#locationContextBox`).val().split(`,`).forEach((contextEntry) => {
				contextEntry = contextEntry.trim();
				jsonDocument.locationContexts.push(contextEntry.replace(/\s/g,`-`).toLowerCase());
			});			
			$.ajax({
			  url: `/UpdateRecord`,
			  dataType: `JSON`,
			  data: jsonDocument,
			  method: `PATCH`,
			  success: (res) => {
				  alert(`Updated Directory Entry`);
				  searchQuery();
				  },
			  error: (err) => {
				  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
					location.reload();
					}
				}
			});
		}
	});
	
		$(`#updateAlertButton`).click(() =>{
		if(checkData()){
		sanitizeNumbers();
			var contactMethodArray = [];
			$(`.contact-method-entry`).each(function() {
				var contactMethodName = $(this).find(`.contactMethodName`).val().toString();
				contactMethodArray.push( { contactMethodName: contactMethodName, contactMethodNumber: $(this).find(`.contactMethodData`).val().toString() } );
			});
			var jsonDocument = {
				_id : workingDocumentID,
				firstName: encodeURI($(`#firstNameBox`).val()),
				lastName: encodeURI($(`#lastNameBox`).val()),
				contactMethods: contactMethodArray,
				locationContexts: []
			};
			
			$(`#locationContextBox`).val().split(`,`).forEach((contextEntry) => {
				contextEntry = contextEntry.trim();
				jsonDocument.locationContexts.push(contextEntry.replace(/\s/g,`-`).toLowerCase());
			});			
			$.ajax({
			  url: `/UpdateRecord`,
			  dataType: `JSON`,
			  data: jsonDocument,
			  method: `PATCH`,
			  success: (res) => {
				  alert(`Updated Directory Entry`);
				  searchQuery();
				  },
			  error: (err) => {
				  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
					location.reload();
					}
				}
			});
		}
	});
	
	$(document).on(`keyup`,`.contactMethodData`, () => {
	});		
	
	$(`#destination-type`).on(`change`, () => {	
		switch ($(`#destination-type`).val()) {
			case `Device Group`:
				$(`#destination-device-area`).empty();
				var deviceGroupAppend  = `<label for="device-group-select">Device Group</label>`;
					deviceGroupAppend += `<select class="form-control btn btn-light btn-block" id="device-group-select">`;
					deviceGroups.forEach((group) => {
						deviceGroupAppend += `<option>${group}</option>`;
					});
					deviceGroupAppend += `</select>`;
				$(`#destination-device-area`).append(deviceGroupAppend);
				break;
			case `Location Context`:
				$(`#destination-device-area`).empty();
				var locationContextAppend = `<label for="location-context-select">Location Context</label>`;
					locationContextAppend += `<select class="form-control btn btn-light btn-block" id="location-context-select">`;
					locationContextArray.forEach((context) => {
						locationContextAppend += `<option>${context}</option>`;
					});
					locationContextAppend += `</select>`;
				$(`#destination-device-area`).append(locationContextAppend);
				break;
			case `IP Address`:
				$(`#destination-device-area`).empty();
			default:
				$(`#destination-device-area`).empty();
		}
	});	
	
	$(`#searchBox`).keyup((event) => {
		if (event.keyCode === 13) {
			searchQuery();
		}
	});
	
	$(`#searchButton`).click(() => {
		searchQuery();
	});
	
	$(`#alertSearchButton`).click(() => {
		searchAlerts();
	});
	
	$(`#newButton`).click(() => {
		$(`#contactMethods`).empty();
		$(`#searchBox`).val(``);
		$(`#firstNameBox`).val(``);
		$(`#lastNameBox`).val(``);
		$(`#locationContextBox`).val(``);
		workingDocumentID = null;
		$(`#updateButton`).attr(`disabled`, true);
		$(`#deleteButton`).attr(`disabled`, true);
		$(`#insertButton`).attr(`disabled`, false);
	});
					
	$(`#insertButton`).click(() => {
		if(checkData()){
			$(`#insertButton`).attr(`disabled`, true);
			sanitizeNumbers;
			var contactMethodArray = [];
			$(`.contact-method-entry`).each(function(){
				var contactMethodName = $(this).find(`.contactMethodName`).val().toString();
				contactMethodName = encodeURI(contactMethodName);
				contactMethodArray.push( { contactMethodName: contactMethodName, contactMethodNumber: $(this).find(`.contactMethodData`).val().toString() } );
			});
			var jsonDocument = {
				firstName : encodeURI($(`#firstNameBox`).val()),
				lastName : encodeURI($(`#lastNameBox`).val()),
				contactMethods : contactMethodArray,
				locationContexts: []
			};
			
			$(`#locationContextBox`).val().split(`,`).forEach((contextEntry) => {
				contextEntry = contextEntry.trim();
				jsonDocument.locationContexts.push(contextEntry.replace(/\s/g,`-`).toLowerCase());
			});
			$.ajax({
				url: `/InsertRecord`,
				dataType: `JSON`,
				data: jsonDocument,
				method: `POST`,
				success: (res) => {
					alert(`Inserted Directory Entry`);
					searchQuery();
					},
			  error: (err) => {
				  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
					  location.reload();
					  }
				  }
			});	
		}
	});	
	
	$(`#deleteButton`).click(() => {
		var jsonDocument = {
			_id : workingDocumentID
		};
		if(confirm(`Are you sure you want to delete this?`)){		
			$.ajax({
				url: `/RemoveRecord`,
				dataType: `JSON`,
				data: jsonDocument,
				method: `DELETE`,
				success: (res) => {
					alert(`Deleted Directory Entry`);
					searchQuery();
					},
			  error: (err) => {
				  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
					  location.reload();
					  }
				  }
			});	
		}
	});
	
	$(document).on(`click`,`.removeContactMethodButton`, function(){
		if(confirm(`Are you sure you want to remove this?`)){
			$(this).parent().remove();
		}
	});
	
	$(`#addContactMethodButton`).click(() => {
		if($(`#contactMethods`).children().length < 64){
			let appendHTML = `<div class="input-group contact-method-entry">\n`;
				appendHTML+= `<input class="btn btn-light form-control contact-method contactMethodName" rows="1" maxlength="17" placeholder="Contact Method Name" type="search" list="contact-method-list"></input>\n`;
				appendHTML+= `<input class="btn btn-light form-control contact-method contactMethodData" rows="1" maxlength="17" placeholder="Contact Number"></input>\n`;
				appendHTML+= `<button class="btn btn-danger input-group-append removeContactMethodButton">-</button>\n`;
				appendHTML+= `</div>\n`;
			$(`#contactMethods`).append(appendHTML);
		} else {
			alert(`A maximum of 64 contact methods are supported`);
		}
	});
	
	searchQuery();
	searchAlerts();
});

entrySelect = (data) => {
	var searchResultsArray = [];
	$(`#contactMethods`).empty();
	$(`.form-control`).removeClass(`btn-danger`);
	$(`.form-control`).removeClass(`btn-warning`);
	$.ajax({
		url: `/SearchID`,
		dataType: `JSON`,
		data: { _id: data},
		method: `GET`,
		success: (res) => {
			searchResultsArray = res;
			$(`#firstNameBox`).val(``);
			$(`#lastNameBox`).val(``);
			$(`#locationContextBox`).val(``);
			$(`#firstNameBox`).val(searchResultsArray[0].firstName);
			$(`#lastNameBox`).val(searchResultsArray[0].lastName);
			if(searchResultsArray[0].hasOwnProperty(`locationContexts`)){
			$(`#locationContextBox`).val(searchResultsArray[0].locationContexts.join(`, `));
			}
			if(searchResultsArray[0].contactMethods){
				searchResultsArray[0].contactMethods.forEach((contactMethod) => {
					let appendHTML = `<div class="input-group contact-method-entry">\n`;
						appendHTML+= `<input tool class="btn btn-light form-control contact-method contactMethodName" rows="1" value="${contactMethod.contactMethodName}" maxlength="17" placeholder="Contact Method Name" type="search" list="contact-method-list"></input>\n`;
						appendHTML+= `<input class="btn btn-light form-control contact-method contactMethodData" rows="1" value="${contactMethod.contactMethodNumber}" maxlength="17" placeholder="Contact Number"></input>\n`;
						appendHTML+= `<button class="btn btn-danger input-group-append removeContactMethodButton">-</button>\n`;
						appendHTML+= `</div>`;
					$(`#contactMethods`).append(appendHTML);
				});
			}
			workingDocumentID = searchResultsArray[0]._id;
			$(`#updateButton`).attr(`disabled`, false);
			$(`#deleteButton`).attr(`disabled`, false);
			$(`#insertButton`).attr(`disabled`, true);
			},
	  error: (err) => {
		  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
			  location.reload();
			  }
		  }
	});	
}

alertEntrySelect = (data) => {
	var searchResultsArray = [];
	$(`#contactMethods`).empty();
	$(`.form-control`).removeClass(`btn-danger`);
	$(`.form-control`).removeClass(`btn-warning`);
	console.log(data);
	$.ajax({
		url: `/SearchAlerts/id`,
		dataType: `JSON`,
		data: { _id: data},
		method: `GET`,
		success: (res) => {
			searchResultsArray = res[0];
			$(`#notificationTitle`).val(``);
			$(`#notificationText`).val(``);
			//$(`#locationContextBox`).val(``);
			$(`#notificationTitleBox`).val(searchResultsArray.alertTitle);
			$(`#notificationTextBox`).val(searchResultsArray.alertText);
			$(`#led-color`).val(searchResultsArray.ledColor);
			$(`#ring-tone`).val(searchResultsArray.ringTone);
			$(`#repeat-count`).val(searchResultsArray.repeatCount);
			$(`#destination-type`).val(searchResultsArray.destinationType);
			$(`#destination-type`).change();
			if($(`#destination-type`).val() == `Location Context`){
				$(`#location-context-select`).val(searchResultsArray.destination);
			}
			
			
			
			workingDocumentID = searchResultsArray._id;
			$(`#updateButton`).attr(`disabled`, false);
			$(`#deleteButton`).attr(`disabled`, false);
			$(`#insertButton`).attr(`disabled`, true);
			}
	});
	  
}

searchQuery = () => {
	var searchResultsArray = [];
	$(`#searchResults`).empty();
	try {
		if($(`#searchBox`).val().toString() === `` || $(`#searchBox`).val().toString() === ` `){
			$.getJSON(`/SearchDB/.*`).done((data) => {
				searchResultsArray = data;
				searchResultsArray.forEach((resultEntry) => {
					let appendHTML = `<div class="result-entry">\n`;
						appendHTML+= `<div onclick="entrySelect('${resultEntry._id}')">${resultEntry.firstName} ${resultEntry.lastName}</div>\n`;
						appendHTML+= `</div>\n`;
					$(`#searchResults`).append(appendHTML);
				});
			});
		} else {
			$.getJSON(`/SearchDB/${$('#searchBox').val().toString()}`).done((data) => {
				
				searchResultsArray = data;
				searchResultsArray.forEach((resultEntry) =>{
					let appendHTML = `<div class="result-entry">\n`;
						appendHTML+= `<div onclick="entrySelect('${resultEntry._id}')">${resultEntry.firstName} ${resultEntry.lastName}</div>\n`;
						appendHTML+= `</div>\n`;
					$(`#searchResults`).append(appendHTML);
				});
			});
		}
	} catch {
		
	}
}

searchAlerts = () => {
	var searchResultsArray = [];
	$(`#searchResults`).empty();	
		if($(`#alertSearchBox`).val().toString() === `` || $(`#alertSearchBox`).val().toString() === ` `){
			$.getJSON(`/SearchAlerts/.*`).done((data) => {
				searchResultsArray = data;
				searchResultsArray.forEach((resultEntry) => {
					console.log(resultEntry);
					let appendHTML = `<div class="result-entry">\n`;
						appendHTML+= `<div onclick="alertEntrySelect('${resultEntry._id}')">${resultEntry.alertTitle}</div>\n`;
						appendHTML+= `</div>\n`;
					$(`#alertTemplateResultsResults`).append(appendHTML);
				});
			});
		} else {
			$.getJSON(`/SearchAlerts/${$('#searchBox').val().toString()}`).done((data) => {
				
				searchResultsArray = data;
				searchResultsArray.forEach((resultEntry) =>{
					let appendHTML = `<div class="result-entry">\n`;
						appendHTML+= `<div onclick="alertEntrySelect('${resultEntry._id}')">${resultEntry.firstName} ${resultEntry.lastName}</div>\n`;
						appendHTML+= `</div>\n`;
					$(`#alertTemplateResultsResults`).append(appendHTML);
				});
			});
		}
	
}

sanitizeNumbers = () => {
	$(`.contact-method-entry`).each(function(){
		var tempString = $(this).find(`.contactMethodData`).val().toString();
		tempString = tempString.replace(/[^0-9.]/g, '');
		$(this).find(`.contactMethodData`).val(tempString);
	});
}

checkData = () => {
	var warnings = 0;
	var errors = 0;
	var alertMessage = ``;
	if($(`#lastNameBox`).val().length === 0){
		errors++;
		$(`#lastNameBox`).addClass(`btn-danger`);
		alertMessage += `Last name field cannot be blank.\n`;
	} else {
		$(`#lastNameBox`).removeClass(`btn-danger`);
	}
	if($(`#firstNameBox`).val().length === 0){
		warnings++;
		$(`#firstNameBox`).addClass(`btn-warning`);
		alertMessage += `First name field should not be blank.\n`;
	} else {
		$(`#firstNameBox`).removeClass(`btn-warning`);
	}
	$(`.contact-method-entry`).each(function(){
		if($(this).find(`.contactMethodName`).val().length === 0){
			errors++;
			$(this).find(`.contactMethodName`).addClass(`btn-danger`);	
			if(!alertMessage.match(/Contact method name cannot be blank./g)){
				alertMessage += `Contact method name cannot be blank.\n`;
			}
		} else {
			$(this).find(`.contactMethodName`).removeClass(`btn-danger`);	
		}
		if($(this).find(`.contactMethodData`).val().length === 0){
			warnings++;
			$(this).find(`.contactMethodData`).addClass(`btn-warning`);	
			if(!alertMessage.match(/Contact number should not be blank./g)){
				alertMessage += `Contact number should not be blank.\n`;
			}
		} else {
			$(this).find(`.contactMethodData`).removeClass(`btn-warning`);	
		}
	});
	if(alertMessage){
		alert(`Errors: ${errors}\nWarnings: ${warnings} \n${alertMessage}`);
	}
	if(errors !== 0){
		return false;
	} else {
		return true;
	}
}

refreshAlerts = () => {
	
}
