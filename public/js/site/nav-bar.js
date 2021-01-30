$( document ).ready(() => {
	$(`.nav-item`).hover(function () {
		$(`#nav-text`).html($(this).attr(`title`));
	}, ()=>  {
		$(`#nav-text`).text(``);
	});	
});