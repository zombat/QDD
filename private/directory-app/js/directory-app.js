var workingDocumentID;
var deviceGroups = [`test`];

$( document ).ready(() => {
	console.log(`Document Ready`);
	$(`#directory-save-button`).attr(`disabled`, true);
	$(`#directory-delete-button`).attr(`disabled`, true);
	
	$(document).on(`keyup`,`.contactMethodData`, () => {
	});		
	
	$(`#directory-destination-type`).on(`change`, () => {	
		switch ($(`#directory-destination-type`).val()) {
			case `Device Group`:
				$(`#directory-destination-device-area`).empty();
				var deviceGroupAppend  = `<label for="device-group-select">Device Group</label>`;
					deviceGroupAppend += `<select class="form-control btn btn-light btn-block" id="directory-device-group-select">`;
					deviceGroups.forEach((group) => {
						deviceGroupAppend += `<option>${group}</option>`;
					});
					deviceGroupAppend += `</select>`;
				$(`#directory-destination-device-area`).append(deviceGroupAppend);
				break;
			case `Location Context`:
				$(`#directory-destination-device-area`).empty();
				var locationContextAppend = `<label for="directory-location-context-select">Location Context</label>`;
					locationContextAppend += `<select class="form-control btn btn-light btn-block" id="directory-location-context-select">`;
					locationContextArray.forEach((context) => {
						locationContextAppend += `<option>${context}</option>`;
					});
					locationContextAppend += `</select>`;
				$(`#directory-destination-device-area`).append(locationContextAppend);
				break;
			case `IP Address`:
				$(`#directory-destination-device-area`).empty();
			default:
				$(`#directory-destination-device-area`).empty();
		}
	});	
	
	$(`#directory-search-box`).keyup((event) => {
		if (event.keyCode === 13) {
			searchQuery();
		}
	});
	
	$(`#directory-search-button`).click(() => {
		searchQuery();
	});
	
	$(`#directory-delete-button`).click(() => {
		var jsonDocument = {
			_id : workingDocumentID
		};
		if(confirm(`Are you sure you want to delete this?`)){		
			$.ajax({
				url: `directory-app/RemoveRecord`,
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
	
	$(`#directory-save-button`).click(() =>{
		if(checkData()){
		sanitizeNumbers();
			var contactMethodArray = [];
			$(`.contact-method-entry`).each(function() {
				var contactMethodName = $(this).find(`.contactMethodName`).val().toString();
				contactMethodArray.push( { contactMethodName: contactMethodName, contactMethodNumber: $(this).find(`.contactMethodData`).val().toString() } );
			});
			var jsonDocument = {
				_id : ``,
				firstName: encodeURI($(`#directory-first-name-box`).val()),
				lastName: encodeURI($(`#directory-last-name-box`).val()),
				contactMethods: contactMethodArray,
				locationContexts: []
			}
			if(workingDocumentID != null){
				jsonDocument._id = workingDocumentID;
			}
			
			$(`#directory-location-context-box`).val().split(`,`).forEach((contextEntry) => {
				contextEntry = contextEntry.trim();
				jsonDocument.locationContexts.push(contextEntry.replace(/\s/g,`-`).toLowerCase());
			});			
			$.ajax({
			  url: `directory-app/UpdateRecord`,
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
	
	$(`#directory-new-button`).click(() => {
		$(`#directory-contact-methods`).empty();
		$(`#directory-search-box`).val(``);
		$(`#directory-first-name-box`).val(``);
		$(`#directory-last-name-box`).val(``);
		$(`#directory-location-context-box`).val(``);
		workingDocumentID = null;
		$(`#directory-save-button`).attr(`disabled`, false);
		$(`#directory-delete-button`).attr(`disabled`, true);
	});
	$(document).on(`click`,`.removeContactMethodButton`, function(){
		if(confirm(`Are you sure you want to remove this?`)){
			$(this).parent().remove();
		}
	});
	
	$(`#directory-add-contact-method-button`).click(() => {
		if($(`#directory-contact-methods`).children().length < 64){
			let appendHTML = `<div class="input-group contact-method-entry">\n`;
				appendHTML+= `<input class="btn btn-light form-control contact-method contactMethodName" rows="1" maxlength="17" placeholder="Contact Method Name" type="search" list="contact-method-list"></input>\n`;
				appendHTML+= `<input class="btn btn-light form-control contact-method contactMethodData" rows="1" maxlength="17" placeholder="Contact Number"></input>\n`;
				appendHTML+= `<button class="btn btn-danger input-group-append removeContactMethodButton">-</button>\n`;
				appendHTML+= `</div>\n`;
			$(`#directory-contact-methods`).append(appendHTML);
		} else {
			alert(`A maximum of 64 contact methods are supported`);
		}
	});
	
	searchQuery();
});

entrySelect = (data) => {
	var searchResultsArray = [];
	$(`#directory-contact-methods`).empty();
	$(`.form-control`).removeClass(`btn-danger`);
	$(`.form-control`).removeClass(`btn-warning`);
	$.ajax({
		url: `directory-app/SearchID`,
		dataType: `JSON`,
		data: { _id: data},
		method: `GET`,
		success: (res) => {
			searchResultsArray = res;
			$(`#directory-first-name-box`).val(``);
			$(`#directory-last-name-box`).val(``);
			$(`#directory-location-context-box`).val(``);
			$(`#directory-first-name-box`).val(searchResultsArray[0].firstName);
			$(`#directory-last-name-box`).val(searchResultsArray[0].lastName);
			if(searchResultsArray[0].hasOwnProperty(`locationContexts`)){
			$(`#directory-location-context-box`).val(searchResultsArray[0].locationContexts.join(`, `));
			}
			if(searchResultsArray[0].contactMethods){
				searchResultsArray[0].contactMethods.forEach((contactMethod) => {
					let appendHTML = `<div class="input-group contact-method-entry">\n`;
						appendHTML+= `<input tool class="btn btn-light form-control contact-method contactMethodName" rows="1" value="${contactMethod.contactMethodName}" maxlength="17" placeholder="Contact Method Name" type="search" list="contact-method-list"></input>\n`;
						appendHTML+= `<input class="btn btn-light form-control contact-method contactMethodData" rows="1" value="${contactMethod.contactMethodNumber}" maxlength="17" placeholder="Contact Number"></input>\n`;
						appendHTML+= `<button class="btn btn-danger input-group-append removeContactMethodButton">-</button>\n`;
						appendHTML+= `</div>`;
					$(`#directory-contact-methods`).append(appendHTML);
				});
			}
			workingDocumentID = searchResultsArray[0]._id;
			$(`#directory-save-button`).attr(`disabled`, false);
			$(`#directory-delete-button`).attr(`disabled`, false);
			},
	  error: (err) => {
		  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
			  location.reload();
			  }
		  }
	});	
}


searchQuery = () => {
	var searchResultsArray = [];
	$(`#directory-search-results`).empty();
	try {
		if($(`#directory-search-box`).val().toString() === `` || $(`#directory-search-box`).val().toString() === ` `){
			$.getJSON(`directory-app/SearchDB/.*`).done((data) => {
				searchResultsArray = data;
				searchResultsArray.forEach((resultEntry) => {
					let appendHTML = `<div class="result-entry">\n`;
						appendHTML+= `<div onclick="entrySelect('${resultEntry._id}')">${resultEntry.firstName} ${resultEntry.lastName}</div>\n`;
						appendHTML+= `</div>\n`;
					$(`#directory-search-results`).append(appendHTML);
				});
			});
		} else {
			$.getJSON(`directory-app/SearchDB/${$('#searchBox').val().toString()}`).done((data) => {
				
				searchResultsArray = data;
				searchResultsArray.forEach((resultEntry) =>{
					let appendHTML = `<div class="result-entry">\n`;
						appendHTML+= `<div onclick="entrySelect('${resultEntry._id}')">${resultEntry.firstName} ${resultEntry.lastName}</div>\n`;
						appendHTML+= `</div>\n`;
					$(`#directory-search-results`).append(appendHTML);
				});
			});
		}
	} catch {
		
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
	if($(`#directory-last-name-box`).val().length === 0){
		errors++;
		$(`#directory-last-name-box`).addClass(`btn-danger`);
		alertMessage += `Last name field cannot be blank.\n`;
	} else {
		$(`#directory-last-name-box`).removeClass(`btn-danger`);
	}
	if($(`#directory-first-name-box`).val().length === 0){
		warnings++;
		$(`#directory-first-name-box`).addClass(`btn-warning`);
		alertMessage += `First name field should not be blank.\n`;
	} else {
		$(`#directory-first-name-box`).removeClass(`btn-warning`);
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
