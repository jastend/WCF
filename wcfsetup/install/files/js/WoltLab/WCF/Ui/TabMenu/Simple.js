/**
 * Simple tab menu implementation with a straight-forward logic.
 * 
 * @author	Alexander Ebert
 * @copyright	2001-2015 WoltLab GmbH
 * @license	GNU Lesser General Public License <http://opensource.org/licenses/lgpl-license.php>
 * @module	WoltLab/WCF/Ui/TabMenu/Simple
 */
define(['Dictionary', 'Dom/Traverse', 'Dom/Util', 'EventHandler'], function(Dictionary, DomTraverse, DomUtil, EventHandler) {
	"use strict";
	
	/**
	 * @param	{Element}	container	container element
	 * @constructor
	 */
	function TabMenuSimple(container) {
		this._container = container;
		this._containers = new Dictionary();
		this._isLegacy = null;
		this._tabs = new Dictionary();
	};
	
	TabMenuSimple.prototype = {
		/**
		 * Validates the properties and DOM structure of this container.
		 * 
		 * Expected DOM:
		 * <div class="tabMenuContainer">
		 * 	<nav>
		 * 		<ul>
		 * 			<li data-name="foo"><a>bar</a></li>
		 * 		</ul>
		 * 	</nav>
		 * 	
		 * 	<div id="foo">baz</div>
		 * </div>
		 * 
		 * @return	{boolean}	false if any properties are invalid or the DOM does not match the expectations
		 */
		validate: function() {
			if (!this._container.classList.contains('tabMenuContainer')) {
				return false;
			}
			
			var nav = DomTraverse.childByTag(this._container, 'NAV');
			if (nav === null) {
				return false;
			}
			
			// get children
			var tabs = elByTag('li', nav);
			if (tabs.length === null) {
				return false;
			}
			
			var container, containers = DomTraverse.childrenByTag(this._container, 'DIV'), name;
			for (var i = 0, length = containers.length; i < length; i++) {
				container = containers[i];
				name = elAttr(container, 'data-name');
				
				if (!name) {
					name = DomUtil.identify(container);
				}
				
				elAttr(container, 'data-name', name);
				this._containers.set(name, container);
			}
			
			var containerId = this._container.id, tab;
			for (var i = 0, length = tabs.length; i < length; i++) {
				tab = tabs[i];
				name = this._getTabName(tab);
				
				if (!name) {
					continue;
				}
				
				if (this._tabs.has(name)) {
					throw new Error("Tab names must be unique, li[data-name='" + name + "'] (tab menu id: '" + containerId + "') exists more than once.");
				}
				
				container = this._containers.get(name);
				if (container === undefined) {
					throw new Error("Expected content element for li[data-name='" + name + "'] (tab menu id: '" + containerId + "').");
				}
				else if (container.parentNode !== this._container) {
					throw new Error("Expected content element '" + name + "' (tab menu id: '" + containerId + "') to be a direct children.");
				}
				
				// check if tab holds exactly one children which is an anchor element
				if (tab.childElementCount !== 1 || tab.children[0].nodeName !== 'A') {
					throw new Error("Expected exactly one <a> as children for li[data-name='" + name + "'] (tab menu id: '" + containerId + "').");
				}
				
				this._tabs.set(name, tab);
			}
			
			if (!this._tabs.size) {
				throw new Error("Expected at least one tab (tab menu id: '" + containerId + "').");
			}
			
			if (this._isLegacy) {
				elAttr(this._container, 'data-is-legacy', true);
				
				this._tabs.forEach(function(tab, name) {
					elAttr(tab, 'aria-controls', name);
				});
			}
			
			// create pointer element
			nav.appendChild(elCreate('span'));
			
			return true;
		},
		
		/**
		 * Initializes this tab menu.
		 * 
		 * @param	{Dictionary=}	oldTabs		previous list of tabs
		 * @return	{?Element}	parent tab for selection or null
		 */
		init: function(oldTabs) {
			oldTabs = oldTabs || null;
			
			// bind listeners
			this._tabs.forEach((function(tab) {
				if (!oldTabs || oldTabs.get(elAttr(tab, 'data-name')) !== tab) {
					tab.children[0].addEventListener('click', this._onClick.bind(this));
				}
			}).bind(this));
			
			var returnValue = null;
			if (!oldTabs) {
				var hash = window.location.hash.replace(/^#/, ''), selectTab = null;
				if (hash !== '') {
					selectTab = this._tabs.get(hash);
					
					// check for parent tab menu
					if (selectTab && this._container.parentNode.classList.contains('tabMenuContainer')) {
						returnValue = this._container;
					}
				}
				
				if (!selectTab) {
					var preselect = elAttr(this._container, 'data-preselect');
					if (preselect === "true" || !preselect) preselect = true;
					
					if (preselect === true) {
						this._tabs.forEach(function(tab) {
							if (!selectTab && !tab.previousElementSibling) {
								selectTab = tab;
							}
						});
					}
					else if (preselect !== "false") {
						selectTab = this._tabs.get(preselect);
					}
				}
				
				if (selectTab) {
					this._containers.forEach(function(container) {
						container.classList.add('hidden');
					});
					
					this.select(null, selectTab, true);
				}
			}
			
			return returnValue;
		},
		
		/**
		 * Selects a tab.
		 * 
		 * @param	{?(string|integer)}	name		tab name or sequence no
		 * @param	{Element=}		tab		tab element
		 * @param	{boolean=}		disableEvent	suppress event handling
		 */
		select: function(name, tab, disableEvent) {
			tab = tab || this._tabs.get(name);
			
			if (!tab) {
				// check if name is an integer
				if (~~name == name) {
					name = ~~name;
					
					var i = 0;
					this._tabs.forEach(function(item) {
						if (i === name) {
							tab = item;
						}
						
						i++;
					});
				}
				
				if (!tab) {
					throw new Error("Expected a valid tab name, '" + name + "' given (tab menu id: '" + this._container.id + "').");
				}
			}
			
			name = name || elAttr(tab, 'data-name');
			
			// unmark active tab
			var oldTab = elBySel('#' + this._container.id + ' > nav > ul > li.active');
			var oldContent = null;
			if (oldTab) {
				if (elAttr(oldTab, 'data-name') === name) {
					// same tab
					return;
				}
				
				oldTab.classList.remove('active');
				oldContent = this._containers.get(elAttr(oldTab, 'data-name'));
				oldContent.classList.remove('active');
				oldContent.classList.add('hidden');
				
				if (this._isLegacy) {
					oldTab.classList.remove('ui-state-active');
					oldContent.classList.remove('ui-state-active');
				}
			}
			
			tab.classList.add('active');
			var newContent = this._containers.get(name);
			newContent.classList.add('active');
			
			if (this._isLegacy) {
				tab.classList.add('ui-state-active');
				newContent.classList.add('ui-state-active');
				newContent.classList.remove('hidden');
			}
			
			// set pointer position
			var span = DomTraverse.childByTag(tab.parentNode.parentNode, 'SPAN');
			if (span !== null) {
				span.style.setProperty('transform', 'translateX(' + tab.offsetLeft + 'px)');
				span.style.setProperty('width', tab.clientWidth + 'px');
			}
			
			if (!disableEvent) {
				EventHandler.fire('com.woltlab.wcf.simpleTabMenu_' + this._container.id, 'select', {
					active: tab,
					activeName: name,
					previous: oldTab,
					previousName: oldTab ? elAttr(oldTab, 'data-name') : null
				});
				
				var jQuery = (this._isLegacy && typeof window.jQuery === 'function') ? window.jQuery : null;
				if (jQuery) {
					// simulate jQuery UI Tabs event
					jQuery(this._container).trigger('wcftabsbeforeactivate', {
						newTab: jQuery(tab),
						oldTab: jQuery(oldTab),
						newPanel: jQuery(newContent),
						oldPanel: jQuery(oldContent)
					});
				}
				
				// update history
				window.history.replaceState(
					undefined,
					undefined,
					window.location.href.replace(/#[^#]+$/, '') + '#' + name
				);
			}
		},
		
		/**
		 * Rebuilds all tabs, must be invoked after adding or removing of tabs.
		 * 
		 * Warning: Do not remove tabs if you plan to add these later again or at least clone the nodes
		 *          to prevent issues with already bound event listeners. Consider hiding them via CSS.
		 */
		rebuild: function() {
			var oldTabs = new Dictionary();
			oldTabs.merge(this._tabs);
			
			this.validate();
			this.init(oldTabs);
		},
		
		/**
		 * Handles clicks on a tab.
		 * 
		 * @param	{object}	event	event object
		 */
		_onClick: function(event) {
			event.preventDefault();
			
			this.select(null, event.currentTarget.parentNode);
		},
		
		/**
		 * Returns the tab name.
		 * 
		 * @param	{Element}	tab	tab element
		 * @return	{string}	tab name
		 */
		_getTabName: function(tab) {
			var name = elAttr(tab, 'data-name');
			
			// handle legacy tab menus
			if (!name) {
				if (tab.childElementCount === 1 && tab.children[0].nodeName === 'A') {
					if (tab.children[0].href.match(/#([^#]+)$/)) {
						name = RegExp.$1;
						
						if (elById(name) === null) {
							name = null;
						}
						else {
							this._isLegacy = true;
							elAttr(tab, 'data-name', name);
						}
					}
				}
			}
			
			return name;
		},
		
		/**
		 * Returns the list of registered content containers.
		 * 
		 * @returns	{Dictionary}	content containers
		 */
		getContainers: function() {
			return this._containers;
		},
		
		/**
		 * Returns the list of registered tabs.
		 * 
		 * @returns	{Dictionary}	tab items
		 */
		getTabs: function() {
			return this._tabs;
		}
	};
	
	return TabMenuSimple;
});