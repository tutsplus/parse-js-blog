$(function() {

	Parse.$ = jQuery;

	// Replace this line with the one on your Quickstart Guide Page
	Parse.initialize("W8vTW6MTre3g0ScTeyPzqc6Uzj2KZoQ6GBv0j6ZC", "VVayP3EdZ6QH0QMttzpWgeJ2if4f2m8QjA10SaFQ");

	var TestObject = Parse.Object.extend("TestObject");
	var testObject = new TestObject();
	testObject.save({foo: "bar"}).then(function(object) {
	  alert("yay! it worked");
	});

});