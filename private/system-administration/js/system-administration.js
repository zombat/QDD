var workingDocumentID;
var deviceGroups = [`test`];

$( document ).ready(() => {
	console.log(`Document Ready`);
	$(`#directory-save-button`).attr(`disabled`, true);
	$(`#directory-delete-button`).attr(`disabled`, true);

	$(document).on(`keyup`,`.contactMethodData`, () => {
	});

	$(`#system-administration-save-button`).click(() => {
		if(confirm(`Are you ABSOLUTELY sure you want to change system settings?`)){
			let eachObject = {};
			let globalVariables = [];

			$(`.form-group`).children().each(function (index, element){
				if(element.outerHTML.match(/h4/i)){
					if(eachObject.hasOwnProperty(`_id`)){
						globalVariables.push(eachObject);
						eachObject = {};
					}
					eachObject._id = element.outerHTML.replace(/<h4 class="top-10-down">|<\/h4>/g,``);
				} else if(element.id.length && element.value.length){
					eachObject[element.id] = element.value;
				} else if(element.outerHTML.match(/checkbox/i)){
					console.log(element);
					eachObject[element.outerHTML.match(/id="(.*?)"/i)[1]] = $(`#${element.outerHTML.match(/id="(.*?)"/i)[1]}`).prop(`checked`);
				}
			});
			if(eachObject.hasOwnProperty(`_id`)){
				globalVariables.push(eachObject);
			}
			$.ajax({
			  url: `system-administration/update/global-variables`,
			  dataType: `JSON`,
			  data: { data: globalVariables },
			  method: `PATCH`,
			  success: (res) => {
				  alert(`Updated System Settings`);
				  },
			  error: (err) => {
				  if(confirm(`Connection error, or session timeout\nSelect OK to reload page.`)){
					//location.reload();
					}
				}
			});
		}
	});
});
