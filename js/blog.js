$(function() {

	Parse.$ = jQuery;

	// Replace this line with the one on your Quickstart Guide Page
	Parse.initialize("moyicat-parse-blog-git");
	Parse.serverURL = 'https://moyicat-parse-blog-git.herokuapp.com/parse';

	var $container = $('.main-container'),
		$sidebar = $('.blog-sidebar'),
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

				var category = new Category();
				category.id = data.category;

				this.set({
					'title': data.title,
					'category': category,
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
		Comment = Parse.Object.extend('Comment', {
			add: function(data) {
				this.set({
					'blog': data.blog,
					'authorName': data.authorName,
					'email': data.email,
					'content': data.content
				}).save(null, {
					success: function(comment) {
						// Just reload the page so the author can see the comment being posted.
						window.location.reload();
					},
					error: function(comment, error) {
						console.log(blog);
						console.log(error);
					}
				});
			}
		}),
		Category = Parse.Object.extend('Category', {}),
		BlogView = Backbone.View.extend({
			template: Handlebars.compile($('#blog-tpl').html()),
			events: {
				'submit .form-comment': 'submit'
			},
			submit: function(e) {
				e.preventDefault();
				var data = $(e.target).serializeArray(),
					comment = new Comment();
				comment.add({
					blog: this.model,
					authorName: data[0].value, 
					email: data[1].value,
					content: data[2].value
				});
			},
			render: function() { 
				this.$el.html(this.template({
					blog: this.model,
					comment: this.collection
				}));
			}
		}),
		BlogsView = Backbone.View.extend({
			template: Handlebars.compile($('#blogs-tpl').html()),
			render: function() { 
				var collection = { blog: this.collection };
				this.$el.html(this.template(collection));
			}
		}),
		CategoriesView = Backbone.View.extend({
			template: Handlebars.compile($('#categories-tpl').html()),
			render: function() {
				var collection = { category: this.collection };
				this.$el.html(this.template(collection));
			}
		}),
		LoginView = Backbone.View.extend({
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
		BlogsAdminView = Backbone.View.extend({
			template: Handlebars.compile($('#admin-tpl').html()),
			render: function() {
				this.$el.html(this.template({
					user: this.model,
					blog: this.collection
				}));
			}
		}),
		WriteBlogView = Backbone.View.extend({
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
					category: data[1].value,
					summary: data[2].value,
					content: data[3].value
				});
			},
			render: function(){
				var self = this;

				// If the user is editing a blog, that means there will be a blog set as this.model
				// therefore, we use this logic to render different titles and pass in empty strings

				var blog = self.model || {};
				var form_title = self.model ? 'Edit Blog' : 'Add a Blog';


				if (self.model) {
					_.each(self.collection, function(category){
						if (category.id === self.model.attributes.category.id) {
							category.selected = true;
						}
					});
				}

				self.$el.html(self.template({
					form_title: form_title,
					blog: blog,
					category: self.collection
				})).find('.write-content').wysihtml5();
				
			}
		}),
		BlogRouter = Backbone.Router.extend({
		
			// Here you can define some shared variables
			initialize: function(options){
				this.blogs = new Parse.Query(Blog);
				this.categories = new Parse.Query(Category);
			},
			
			// This runs when we start the router. Just leave it for now.
			start: function(){
				Backbone.history.start({
					// put in your directory below
					root: '/tutorial_blog/'
				});

				this.categories.find().then(function(categories) {
					var categoriesView = new CategoriesView({ collection: categories });
					categoriesView.render();
					$('.blog-sidebar').html(categoriesView.el);
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
				'logout': 'logout',
				'category/:id': 'category'
			},

			index: function() {
				this.blogs.find({
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
			category: function(id) {
				// Get the current category object
				var query = new Parse.Query(Category);
				query.get(id, {
					success: function(category) {
						// Query to get the blogs under that category
						var collection = new Parse.Query(Blog).equalTo("category", category).descending('createdAt');
						// Fetch blogs
						collection.find().then(function(blogs){
							// Render blogs
							var blogsView = new BlogsView({ collection: blogs });
							blogsView.render();
							$container.html(blogsView.el);
						});
					},
					error: function(category, error) {
						console.log(error);
					}
				});
			},
			blog: function(id) {
				var query = new Parse.Query(Blog);
				query.get(id, {
					success: function(blog) {
						var collection = new Parse.Query(Comment).equalTo("blog", blog).descending("createdAt");
						collection.find().then(function(comments){
							var blogView = new BlogView({ 
								model: blog,
								collection: comments,
							});
							blogView.render();
							$container.html(blogView.el);
						});
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
					this.blogs.equalTo("author", currentUser).find({
						success: function(blogs) {
							var blogsAdminView = new BlogsAdminView({ 
								// Pass in current username to be rendered in #admin-tpl
								model: currentUser,
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
				var self = this;
				// Check login
				if (!Parse.User.current()) {
					this.navigate('#/login', { trigger: true });
				} else {
					self.categories.find().then(function(categories) {
						var writeBlogView = new WriteBlogView({ 
								collection: categories
							});
						writeBlogView.render();
						$container.html(writeBlogView.el);
					});
				}
			},
			edit: function(id) {
				var self = this;
				// Check login
				if (!Parse.User.current()) {
					self.navigate('#/login', { trigger: true });
				} else {
					var query = new Parse.Query(Blog);
					query.get(id, {
						success: function(blog) {
							self.categories.find().then(function(categories) {
								var writeBlogView = new WriteBlogView({ 
									model: blog,
									collection: categories
								});
								writeBlogView.render();
								$container.html(writeBlogView.el);
							});
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