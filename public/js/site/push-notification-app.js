var workingDocumentID;
var deviceGroups = [`test`];

$( document ).ready(() => {
	console.log(`Document Ready`);
	$(`#push-notification-save-button`).attr(`disabled`, true);
	$(`#push-notification-delete-button`).attr(`disabled`, true);
	$(`#push-notification-insert-button`).attr(`disabled`, true);

	
	$(`#push-notification-send`).click(() =>{
		var jsonDocument = {
			destinationType: $(`#push-notification-destination-type`).val(),
			notificationTitle: $(`#push-notification-notification-title-box`).val(),
			notificationText: $(`#push-notification-notification-text-box`).val(),
			ringType: $(`#push-notification-ring-tone`).val(),
			ledColor: $(`#push-notification-led-color`).val(),
			repeatCount: $(`#push-notification-repeat-count`).val(),
			clearAfter: $(`#push-notification-clear-after`).is(`:checked`)
		};
		
		if($(`#device-destination`).val().match(`,`)){
			jsonDocument.destination = $(`#device-destination`).val().split(`,`);
		} else {
			jsonDocument.destination = $(`#device-destination`).val();
		}
		
		$.ajax({
			  url: `push-notification-app/notifyfunction`,
			  dataType: `JSON`,
			  data: jsonDocument,
			  method: `POST`,
			  success: (res) => {
				  searchAlerts();
				  },
			  error: (err) => {
				  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
					  location.reload();
				  }
				}
			});
	});	
	
	$(`#push-notification-destination-type`).on(`change`, () => {
		let deviceDestinationAppend =``;
		switch ($(`#push-notification-destination-type`).val()) {
			case `Device Group`:
				deviceDestinationAppend += `<label for="device-destination">Device Group</label>`;
				deviceDestinationAppend += `<select class="form-control btn btn-light btn-block" id="device-destination">`;
				deviceGroups.forEach((group) => {
					deviceDestinationAppend += `<option>${group}</option>`;
				});
				deviceDestinationAppend += `</select>`;
				
				break;
			case `Location Context`:
				deviceDestinationAppend += `<label for="device-destination">Location Context</label>`;
				deviceDestinationAppend += `<select class="form-control btn btn-light btn-block" id="device-destination">`;
				locationContextArray.forEach((context) => {
					deviceDestinationAppend += `<option>${context}</option>`;
				});
				deviceDestinationAppend += `</select>`;
				break;
			case `IP Address`:
				$(`#push-notification-destination-device-area`).empty();
				deviceDestinationAppend += `<label for="device-destination">IP Address(s), Range, or CIDR Subnet</label>`;
				deviceDestinationAppend += `<input class="form-control btn btn-light btn-block" id="device-destination" placeholder="[xxx.xxx.xxx.xxx|xxx.xxx.xxx.xxx,xxx.xxx.xxx.xxx|xxx.xxx.xxx.xxx-xxx.xxx.xxx.xxx|xxx.xxx.xxx.xxx/xx]"/>`;
			default:
				
		}
		$(`#push-notification-destination-device-area`).empty();
		$(`#push-notification-destination-device-area`).append(deviceDestinationAppend);
	});	
	
	$(`#push-notification-alert-search-button`).click(() => {
		searchAlerts();
	});
	
	$(`#push-notification-delete-button`).click(() => {
		if(confirm(`Are you sure you want to delete this?`)){		
			$.ajax({
				url: `push-notification-app/delete-alert-template`,
				dataType: `JSON`,
				data: { _id: workingDocumentID },
				method: `DELETE`,
				success: (res) => {
					alert(`Deleted Directory Entry`);
					searchAlerts();
					},
			  error: (err) => {
				  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
					  location.reload();
				  }
			  }				  
			});	
		}
	});
	
	$(`#push-notification-save-button`).click(() =>{
		var jsonDocument = {
			_id: workingDocumentID,
			destinationType: $(`#push-notification-destination-type`).val(),
			notificationTitle: $(`#push-notification-notification-title-box`).val(),
			notificationText: $(`#push-notification-notification-text-box`).val(),
			ringTone: $(`#push-notification-ring-tone`).val(),
			ledColor: $(`#push-notification-led-color`).val(),
			repeatCount: $(`#push-notification-repeat-count`).val(),
			clearAfter: $(`#push-notification-clear-after`).is(`:checked`)
		};
		
		if($(`#device-destination`).val().match(`,`)){
			jsonDocument.destination = $(`#device-destination`).val().split(`,`);
		} else {
			jsonDocument.destination = $(`#device-destination`).val();
		}		
		saveNotification(jsonDocument,`update-alert-template`);
	});
	
	$(`#push-notification-new-button`).click(() => {
		$(`#push-notification-alert-search-box`).val(``);
		$(`#push-notification-notification-title-box`).val(``);
		$(`#push-notification-notification-text-box`).val(``);
		$(`#push-notification-led-color`).val(`1`);
		$(`#push-notification-ring-tone`).val(`0`);
		$(`#push-notification-repeat-count`).val(`0`);
		$(`#push-notification-destination-type`).val(`Location Context`);
		$(`#push-notification-destination-type`).change();
		workingDocumentID = null;
		$(`#push-notification-led-color`).attr(`disabled`, false);
		$(`#push-notification-ring-tone`).attr(`disabled`, false);
		$(`#push-notification-repeat-count`).attr(`disabled`, false);
		$(`#push-notification-destination-type`).attr(`disabled`, false);
		$(`#push-notification-save-button`).attr(`disabled`, false);
		$(`#push-notification-delete-button`).attr(`disabled`, true);
		$(`#push-notification-insert-button`).attr(`disabled`, false);
		$(`#push-notification-send`).attr(`disabled`, false);
		$(`#push-notification-cancel-notification-area`).remove();
	});	
	searchAlerts();
});

saveNotification = (jsonDocument, patchType) =>{
	if(typeof jsonDocument == `string`){
		jsonDocument = { _id: jsonDocument};
	}
	$.ajax({
		  url: `push-notification-app/${patchType}`,
		  dataType: `JSON`,
		  data: jsonDocument,
		  method: `PATCH`,
		  success: (res) => {
			  alert(`Saved Push Notification`);
			  if(patchType == `cancel-active-alert`){  
				$(`#push-notification-cancel-notification-area`).remove();
				if($(`#push-notification-clear-after`).is(`:checked`)){
					var jsonDocument = {
						destinationType: $(`#push-notification-destination-type`).val(),
						notificationTitle: `Cancel Alert`,
						notificationText: `%BLANK%`,
						ringType: $(`#push-notification-ring-tone`).val(),
						ledColor: $(`#push-notification-led-color`).val(),
						repeatCount: $(`#push-notification-repeat-count`).val(),
						clearAfter: $(`#push-notification-clear-after`).is(`:checked`)
					}
					if($(`#device-destination`).val().match(`,`)){
						jsonDocument.destination = $(`#device-destination`).val().split(`,`);
					} else {
						jsonDocument.destination = $(`#device-destination`).val();
					}	
				}
				$.ajax({
					  url: `push-notification-app/notifyfunction`,
					  dataType: `JSON`,
					  data: jsonDocument,
					  method: `POST`,
					  success: (res) => {
						  searchAlerts();
						  },
					  error: (err) => {
						  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
							  location.reload();
						  }
						}
					});
			  }
		  },
		  error: (err) => {
			  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
				location.reload();
			  }
			}
		});	
}

alertEntrySelect = (data, alertType) => {
	workingDocumentID = data;
	var searchResultsArray = [];
	$(`#contactMethods`).empty();
	$(`.form-control`).removeClass(`btn-danger`);
	$(`.form-control`).removeClass(`btn-warning`);
	$.ajax({
		url: `push-notification-app/SearchAlerts/id`,
		dataType: `JSON`,
		data: { _id: data, alertType: alertType},
		method: `GET`,
		success: (res) => {
			if(res.document.clearAfter == `true`){
				res.document.clearAfter = true;
			} else {
				res.document.clearAfter = false;
			}
			if(res.doucmentType == `alert-template`){
				$(`#push-notification-notification-title`).val(``);
				$(`#push-notification-notification-text`).val(``);
				//$(`#locationContextBox`).val(``);
				$(`#push-notification-notification-title-box`).val(res.document.notificationTitle);
				$(`#push-notification-notification-text-box`).val(res.document.notificationText);
				$(`#push-notification-led-color`).val(res.document.ledColor);
				$(`#push-notification-ring-tone`).val(res.document.ringTone);
				$(`#push-notification-repeat-count`).val(res.document.repeatCount);
				$(`#push-notification-destination-type`).val(res.document.destinationType);
				$(`#push-notification-clear-after`).prop(`checked`, res.document.clearAfter);
				$(`#push-notification-destination-type`).change();
				$(`#device-destination`).val(res.document.destination);
				$(`#push-notification-led-color`).attr(`disabled`, false);
				$(`#push-notification-ring-tone`).attr(`disabled`, false);
				$(`#push-notification-repeat-count`).attr(`disabled`, false);
				$(`#push-notification-destination-type`).attr(`disabled`, false);
				$(`#push-notification-save-button`).attr(`disabled`, false);
				$(`#push-notification-delete-button`).attr(`disabled`, false);
				$(`#push-notification-clear-after`).attr(`disabled`, false);
				$(`#push-notification-send`).attr(`disabled`, false);
				$(`#push-notification-cancel-notification-area`).remove();
			} else if(res.doucmentType == `active-alert`){
				console.log(res.document.alertDocument);
				$(`#push-notification-notification-title-box`).val(res.document.alertDocument.notificationTitle);
				$(`#push-notification-notification-text-box`).val(res.document.alertDocument.notificationText);
				$(`#push-notification-led-color`).val(``);
				$(`#push-notification-ring-tone`).val(``);
				$(`#push-notification-repeat-count`).val(``);
				$(`#push-notification-destination-type`).val(res.document.alertDocument.alertDestination.type);
				$(`#push-notification-destination-type`).change();
				$(`#device-destination`).val(res.document.alertDocument.alertDestination.destination);
				$(`#push-notification-led-color`).attr(`disabled`, true);
				$(`#push-notification-ring-tone`).attr(`disabled`, true);
				$(`#push-notification-repeat-count`).attr(`disabled`, true);
				//$(`#push-notification-destination-type`).attr(`disabled`, true);
				$(`#push-notification-send`).attr(`disabled`, true);
				let appendHTML  = `<div id="push-notification-cancel-notification-area" class="row">`;
					appendHTML += `<div class="col-12">`;
					appendHTML += `<button class="btn btn-success btn-block" id="push-notification-cancel" onclick="saveNotification('${res.document._id}','cancel-active-alert')">Cancel Active Notification</button>`;
					appendHTML += `</div>`;
					appendHTML += `</div>`;
				if(!$(`#push-notification-cancel`).length){
					$(`#push-notification-modifier-buttons`).append(appendHTML);
				}
			}
		},
		error: (err) => {
			if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
				location.reload();
			}
		}
	});
}

searchAlerts = () => {
	$(`#push-notification-alert-template-results`).empty();
	if($(`#push-notification-alert-search-box`).val().toString() === `` || $(`#push-notification-alert-search-box`).val().toString() === ` `){
		var searchString = `.*`;
	} else {
		var serchString = $(`#push-notification-alert-search-box`).val().toString();
	}
	$.getJSON(`push-notification-app/SearchAlerts/${searchString}`).done((res) => {
		if(res.hasOwnProperty(`activeAlerts`) && res.hasOwnProperty(`alertTemplates`)){
			res.activeAlerts.forEach((activeAlertEntry) => {
				console.log(activeAlertEntry);
				let appendHTML = `<div class="result-entry">\n`;
					appendHTML+= `<div onclick="alertEntrySelect('${activeAlertEntry._id}','active-alert')"> <i class="fas fa-exclamation-triangle" aria-hidden="true"></i> <i class="fas fa-spin fa-spinner" aria-hidden="true"></i>  ${activeAlertEntry.alertDocument.notificationTitle}</div>\n`;
					appendHTML+= `</div>\n`;
				$(`#push-notification-alert-template-results`).append(appendHTML);
			});
			res.alertTemplates.forEach((resultTemplateEntry) => {
				console.log(resultTemplateEntry);
				let appendHTML = `<div class="result-entry">\n`;
					appendHTML+= `<div onclick="alertEntrySelect('${resultTemplateEntry._id}','alert-template')">${resultTemplateEntry.notificationTitle}</div>\n`;
					appendHTML+= `</div>\n`;
				$(`#push-notification-alert-template-results`).append(appendHTML);
			});
		}
	});
}

refreshAlerts = () => {
	
}
