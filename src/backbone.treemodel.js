(function() {

	var ArrMethods = {
		where: function(attrs) {
			var nodes = [];
			_.each(this, function(model) {
				nodes = nodes.concat(model.where(attrs));
			});
			return wrapArray(_.uniq(nodes));
		}
	};
	var wrapArray = function(array) { return _.extend(array, ArrMethods); };

	var TreeModel = Backbone.TreeModel = Backbone.Model.extend({
		constructor: function tree(node) {
			Backbone.Model.prototype.constructor.apply(this, arguments);
			this._nodes = new TreeCollection();
			this._nodes.parent = this;
			this.add(node.nodes);
		},

		/**
		 * returns descendant matching :id
		 */
		find: function(id) { return this.findWhere({id: id}); },

		/**
		 * return first matched descendant
		 */
		findWhere: function(attrs) { return this.where(attrs, true); },

		/**
		 * return all matched descendants
		 */
		where: function(attrs, first, excludeCurrentNode) {
			var nodes = [], matchedNode;

			// manual (non-collection method) check on the current node
			if(!excludeCurrentNode) {
				nodes = nodes.concat(_.where([this.toJSON()], attrs));
			}

			if(first) {
				// return if first/current node is a match
				if(nodes[0]) return nodes[0];

				// return first matched node in children collection
				matchedNode = this._nodes.where(attrs, true);
				if(matchedNode) return matchedNode;

				// recursive call on children nodes
				for(var i=0, len=this._nodes.length; i<len; i++) {
					matchedNode = this._nodes.models[i].where(attrs, true, true);
					if(matchedNode) return matchedNode;
				}
			} else {
				// add all matched children
				nodes = nodes.concat(this._nodes.where(attrs));

				// recursive call on children nodes
				this._nodes.each(function(node) {
					nodes = nodes.concat(node.where(attrs, false, true));
				});

				// return all matched nodes
				return wrapArray(nodes);
			}
		},

		/**
		 * returns true if current node is root node
		 */
		isRoot: function() { return this.parent() === null; },

		/**
		 * returns the root for any node
		 */
		root: function() { return this.parent() && this.parent().root() || this; },

		/**
		 * returns the parent node
		 */
		parent: function() { return this.collection && this.collection.parent || null; },

		/**
		 * returns the children Backbone Collection if children nodes exist
		 */
		nodes: function() { return this._nodes.length && this._nodes || null; },

		/**
		 * returns index of node relative to collection
		 */
		index: function() {
			if(this.isRoot()) return null;
			return this.collection.indexOf(this);
		},

		/**
		 * returns the node to the right
		 */
		next: function() {
			if(this.isRoot()) return null;
			var currentIndex = this.index();
			if(currentIndex < this.collection.length-1) {
				return this.collection.at(currentIndex+1);
			} else {
				return null;
			}
		},

		/**
		 * returns the node to the left
		 */
		prev: function() {
			if(this.isRoot()) return null;
			var currentIndex = this.index();
			if(currentIndex > 0) {
				return this.collection.at(currentIndex-1);
			} else {
				return null;
			}
		},

		/**
		 * removes current node if no attributes arguments is passed,
		 * otherswise remove matched nodes or first matched node
		 */
		remove: function(attrs, first) {
			if(!attrs) {
				if(this.isRoot()) return false; // can't remove root node
				this.collection.remove(this);
				return true;
			} else {
				if(first) {
					this.where(attrs, true).remove();
				} else {
					_.each(this.where(attrs), function(node) {
						if(node.collection) node.remove();
					});
				}
				return this;
			}
		},

		/**
		 * add child/children nodes to Backbone Collection
		 */
		add: function() {
			this._nodes.add.apply(this._nodes, arguments);
			return this;
		},

		/**
		 * inserts a node before the current node
		 */
		insertBefore: function(nodes) {
			if(!this.isRoot()) {
				this.collection.add(nodes, {at: this.index()});
			}
			return this;
		},

		/**
		 * inserts a node after the current node
		 */
		insertAfter: function(nodes) {
			if(!this.isRoot()) {
				this.collection.add(nodes, {at: this.index()+1});
			}
			return this;
		},

		/**
		 * shorthand for getting/inserting nodes before
		 */
		before: function(nodes) {
			if(nodes) return this.insertBefore(nodes);
			return this.prev();
		},

		/**
		 * shorthand for getting/inserting nodes before
		 */
		after: function(nodes) {
			if(nodes) return this.insertAfter(nodes);
			return this.next();
		}
	});

	var TreeCollection = Backbone.TreeCollection = Backbone.Collection.extend({
		model: TreeModel,
		where: function(attrs, opts) {
			if(opts && opts.deep) {
				var nodes = [];
				this.each(function(model) {
					nodes = nodes.concat(model.where(attrs));
				});
				return wrapArray(nodes);
			} else {
				return Backbone.Collection.prototype.where.apply(this, arguments);
			}
		}
	});
}).call(this);
