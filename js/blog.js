$(function() {

	Parse.$ = jQuery;

	// Replace this line with the one on your Quickstart Guide Page
	Parse.initialize("HC87tn6aA7c3sYx9X0vwwLVXeqHDRMYYmrUBK5zv", "3piNGGnRMhvWo8u9pKD9TDc1MJlWhlvK78Vr3fHo");

	var $container = $('.main-container'),
		Blog = Parse.Object.extend('Blog', {
			update: function(data) {
				// Only set ACL if the blog doesn't have it
				if ( !this.get('ACL') ) {
					// Create an ACL object to grant access to the current user 
					// (also the author of the newly created blog)
					var blogACL = new Parse.ACL(Parse.User.current());
					// Grant read-read only access to the public so everyone can see it
					blogACL.setPublicReadAccess(true);
					// Set this ACL object to the ACL field
					this.setACL(blogACL);
				}

				this.set({
					'title': data.title,
					'summary': data.summary,
					'content': data.content,
					// Set author to the existing blog author if editing, use current user if creating
					// The same logic goes into the following three fields
					'author': this.get('author') || Parse.User.current(),
					'authorName': this.get('authorName') || Parse.User.current().get('username'),
					'time': this.get('time') || new Date().toDateString()
				}).save(null, {
					success: function(blog) {
						blogRouter.navigate('#/admin', { trigger: true });
					},
					error: function(blog, error) {
						console.log(blog);
						console.log(error);
					}
				});
			}
		}), 
		Blogs = Parse.Collection.extend({
			model: Blog,
			query: (new Parse.Query(Blog)).descending('createdAt')
		}),
		BlogView = Parse.View.extend({
			template: Handlebars.compile($('#blog-tpl').html()),
			render: function() { 
				var attributes = this.model.toJSON();
				this.$el.html(this.template(attributes));
			}
		}),
		BlogsView = Parse.View.extend({
			template: Handlebars.compile($('#blogs-tpl').html()),
			render: function() { 
				var collection = { blog: this.collection.toJSON() };
				this.$el.html(this.template(collection));
			}
		}),
		LoginView = Parse.View.extend({
			template: Handlebars.compile($('#login-tpl').html()),
			events: {
				'submit .form-signin': 'login'
			},
			login: function(e) {

				// Prevent Default Submit Event
				e.preventDefault();

				// Get data from the form and put them into variables
				var data = $(e.target).serializeArray(),
					username = data[0].value,
					password = data[1].value;

				// Call Parse Login function with those variables
				Parse.User.logIn(username, password, {
					// If the username and password matches
					success: function(user) {
						blogRouter.navigate('#/admin', { trigger: true });
					},
					// If there is an error
					error: function(user, error) {
						console.log(error);
					}
				});
			},
 			render: function(){
				this.$el.html(this.template());
			}
		}),
		BlogsAdminView = Parse.View.extend({
			template: Handlebars.compile($('#admin-tpl').html()),
			render: function() {
				var collection = { 
					username: this.options.username,
					blog: this.collection.toJSON()
				};
				this.$el.html(this.template(collection));
			}
		}),
		WriteBlogView = Parse.View.extend({
			template: Handlebars.compile($('#write-tpl').html()),
			events: {
				'submit .form-write': 'submit'
			},
			submit: function(e) {
				e.preventDefault();
				var data = $(e.target).serializeArray();
				// If there's no blog data, then create a new blog
				this.model = this.model || new Blog();
				this.model.update({
					title: data[0].value, 
					summary: data[1].value,
					content: data[2].value
				});
			},
			render: function(){
				var attributes;
				// If the user is editing a blog, that means there will be a blog set as this.model
				// therefore, we use this logic to render different titles and pass in empty strings
				if (this.model) {
					attributes = this.model.toJSON();
					attributes.form_title = 'Edit Blog';
				} else {
					attributes = {
						form_title: 'Add a Blog',
						title: '',
						summary: '',
						content: ''
					}
				}
				this.$el.html(this.template(attributes)).find('.write-content').wysihtml5();
			}
		}),
		BlogRouter = Parse.Router.extend({
		
			// Here you can define some shared variables
			initialize: function(options){
				this.blogs = new Blogs();
			},
			
			// This runs when we start the router. Just leave it for now.
			start: function(){
				Parse.history.start({
					// put in your directory below
					root: '/tutorial_blog/'
				});
			},
				
			// This is where you map functions to urls.
			// Just add '{{URL pattern}}': '{{function name}}'
			routes: {
				'': 'index',
				'blog/:id': 'blog',
				'admin': 'admin',
				'login': 'login',
				'add': 'add',
				'edit/:id': 'edit',
				'del/:id': 'del',
				'logout': 'logout'
			},

			index: function() {
				this.blogs.fetch({
					success: function(blogs) {
						var blogsView = new BlogsView({ collection: blogs });
						blogsView.render();
						$container.html(blogsView.el);
					},
					error: function(blogs, error) {
						console.log(error);
					}
				});
			},
			blog: function(id) {
				var query = new Parse.Query(Blog);
				query.get(id, {
					success: function(blog) {
						var blogView = new BlogView({ model: blog });
						blogView.render();
						$container.html(blogView.el);
					},
					error: function(blog, error) {
						console.log(error);
					}
				});
			},
			admin: function() {

				var currentUser = Parse.User.current();

				// Check login
				if (!currentUser) {
					this.navigate('#/login', { trigger: true });
				} else {
					this.blogs.fetch({
						success: function(blogs) {
							var blogsAdminView = new BlogsAdminView({ 
								// Pass in current username to be rendered in #admin-tpl
								username: currentUser.get('username'),
								collection: blogs 
							});
							blogsAdminView.render();
							$container.html(blogsAdminView.el);
						},
						error: function(blogs, error) {
							console.log(error);
						}
					});
				}
			},
			login: function() {
				var loginView = new LoginView();
				loginView.render();
				$container.html(loginView.el);
			},
			add: function() {
				// Check login
				if (!Parse.User.current()) {
					this.navigate('#/login', { trigger: true });
				} else {
					var writeBlogView = new WriteBlogView();
					writeBlogView.render();
					$container.html(writeBlogView.el);
				}
			},
			edit: function(id) {
				// Check login
				if (!Parse.User.current()) {
					this.navigate('#/login', { trigger: true });
				} else {
					var query = new Parse.Query(Blog);
					query.get(id, {
						success: function(blog) {
							var writeBlogView = new WriteBlogView({ model: blog });
							writeBlogView.render();
							$container.html(writeBlogView.el);
						},
						error: function(blog, error) {
							console.log(error);
						}
					});
				}
			},
			del: function(id) {
				if (!Parse.User.current()) {
					this.navigate('#/login', { trigger: true });
				} else {
					var self = this,
						query = new Parse.Query(Blog);
					query.get(id).then(function(blog){
						blog.destroy().then(function(blog){
							self.navigate('admin', { trigger: true });
						})
					});
				}
			},
			logout: function () {
				Parse.User.logOut();
				this.navigate('#/login', { trigger: true });
			}
		}),
		blogRouter = new BlogRouter();
		
		blogRouter.start();

});