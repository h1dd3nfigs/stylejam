// Copyright (c) 2016-present, salesforce.com, inc. All rights reserved
// Licensed under BSD 3-Clause - see LICENSE.txt or git.io/sfdc-license

'use strict'

const _ = require('lodash')
const invariant = require('invariant')
let { parse, stringify } = require('scss-parser')

/**
 * Create a new {@link QueryWrapper}
 *
 * @function createQueryWrapper
 * @param {object} ast
 * @param {QueryWrapperOptions} options
 * @returns {function}
 */
module.exports = (ast, options) => {
  invariant(_.isPlainObject(ast), '"ast" must be a plain object')

  /**
   * @namespace QueryWrapperOptions
   */
  options = _.defaults({}, options, {
    /**
     * Return true if the node has children
     *
     * @memberof QueryWrapperOptions
     * @instance
     * @param {object} node
     * @returns {boolean}
     */
    hasChildren: (node) => Array.isArray(node.value),
    /**
     * Return an array of children for a node
     *
     * @memberof QueryWrapperOptions
     * @instance
     * @param {object} node
     * @returns {object[]}
     */
    getChildren: (node) => node.value,
    /**
     * Return a string representation of the node's type
     *
     * @memberof QueryWrapperOptions
     * @instance
     * @param {object} node
     * @returns {string}
     */
    getType: (node) => node.type,
    /**
     * Convert the node back to JSON. This usually just means merging the
     * children back into the node
     *
     * @memberof QueryWrapperOptions
     * @instance
     * @param {object} node
     * @param {object[]} [children]
     * @returns {string}
     */
    toJSON: (node, children) => {
      return Object.assign({}, node, {
        value: children || node.value
      })
    },
    /**
     * Convert the node to a string
     *
     * @memberof QueryWrapperOptions
     * @instance
     * @param {object} node
     * @returns {string}
     */
    toString: (node) => {
      return _.isString(node.value) ? node.value : ''
    }
  })

  for (let key of ['hasChildren', 'getChildren', 'getType', 'toJSON', 'toString']) {
    invariant(_.isFunction(options[key]),
      `options.${key} must be a function`)
  }

  // Commonly used options
  let { hasChildren, getChildren, getType, toJSON, toString } = options

  /**
   * Wrap an AST node to get some basic helpers / parent reference
   */
  class NodeWrapper {
    /**
     * Create a new NodeWrapper
     *
     * @param {object} node
     * @param {NodeWrapper} [parent]
     */
    constructor (node, parent) {
      /**
       * @member {object}
       */
      this.node = node
      /**
       * @member {NodeWrapper}
       */
      this.parent = parent
       /**
       * @member {NodeWrapper[]}
       */
      this.children = this.hasChildren
        ? getChildren(node).map((n) => new NodeWrapper(n, this))
        : null
      Object.freeze(this)
    }
    get hasChildren () {
      return hasChildren(this.node)
    }
    /**
     * Return the JSON representation
     *
     * @returns {object}
     */
    toJSON () {
      return toJSON(
        this.node,
        this.hasChildren ? this.children.map((n) => n.toJSON()) : null
      )
    }
    /**
     * Recursivley reduce the node and it's children
     *
     * @param {function} fn
     * @param {any} acc
     * @returns {object}
     */
    reduce (fn, acc) {
      return this.hasChildren
        ? fn(this.children.reduce((a, n) => n.reduce(fn, a), acc), this)
        : fn(acc, this)
    }
    /**
     * Create a new NodeWrapper or return the argument if it's already a NodeWrapper
     *
     * @param {object|NodeWrapper} node
     * @param {NodeWrapper} [parent]
     * @returns {NodeWrapper}
     */
    static create (node, parent) {
      if (node instanceof NodeWrapper) return node
      return new NodeWrapper(node, parent)
    }
    /**
     * Return true if the provided argument is a NodeWrapper
     *
     * @param {any} node
     * @returns {NodeWrapper}
     */
    static isNodeWrapper (node) {
      return node instanceof NodeWrapper
    }
  }

  /**
   * The root node that will be used if no argument is provided to $()
   */
  const ROOT = NodeWrapper.create(ast)

  /*
   * @typedef {string|regexp|function} Wrapper~Selector
   */

  /**
   * Return a function that will be used to filter an array of QueryWrappers
   *
   * @private
   * @param {string|function} selector
   * @param {boolean} required
   * @returns {function}
   */
  let getSelector = (selector, defaultValue) => {
    defaultValue = !_.isUndefined(defaultValue)
      ? defaultValue : (n) => true
    let isString = _.isString(selector)
    let isRegExp = _.isRegExp(selector)
    let isFunction = _.isFunction(selector)
    if (!(isString || isRegExp || isFunction)) return defaultValue
    if (isString) return (n) => getType(n.node) === selector
    if (isRegExp) return (n) => selector.test(getType(n.node))
    if (isFunction) return selector
  }

  /**
   * Convenience function to return a new Wrapper
   *
   * @private
   * @param {function|string|NodeWrapper|NodeWrapper[]} [selector]
   * @param {NodeWrapper|NodeWrapper[]} [context]
   * @returns {QueryWrapper}
   */
  let $ = (selector, context) => {
    let maybeSelector = getSelector(selector, false)
    let nodes = _.flatten([(maybeSelector ? context : selector) || ROOT])
    invariant(_.every(nodes, NodeWrapper.isNodeWrapper),
      'context must be a NodeWrapper or array of NodeWrappers')
    return maybeSelector
      ? new QueryWrapper(nodes).find(maybeSelector)
      : new QueryWrapper(nodes)
  }

  /**
   * Wrap a {@link NodeWrapper} with chainable traversal/modification functions
   */
  class QueryWrapper {
    /**
     * Create a new QueryWrapper
     *
     * @private
     * @param {NodeWrapper[]} nodes
     */
    constructor (nodes) {
      this.nodes = nodes
    }

    maps() {

      // Eff up some comments
      $('comment_singleline').remove()

      let firstarray = $()
        .find('value')
        .hasParents( 'parentheses' )
        .hasParents( 'declaration' )
        .map((n) => {
          if($(n).has('parentheses').length() === 0) return n
        })

      let parentMap = (arr) => {
        return arr.map((n) => { 
          return $(n)
          .closest('declaration')
          .has('property')
          .find('property')
          .first()
          .value()
        })
      }

      let mapValues = [firstarray.map((n) => {   
        return _.isUndefined(n) ? '' : getType(n.node) === 'stylesheet' ? '' : stringify($(n).get(0))
      })]

      let current = []
      
      let obj = _.stubObject()

      while (!_.every(firstarray, _.isEmpty)) {
        current = parentMap(firstarray)

        if ((!_.isEqual(current, _.last(mapValues))) 
          && (!_.every(current, _.isEmpty))) mapValues.push(current) 
        
        firstarray = firstarray.map((n) => {
          return NodeWrapper.isNodeWrapper(n) ? n.parent : undefined
        })
      }

      _.reverse(mapValues)
        
      let count = 0
      
      for (let value of mapValues[0]) {
        current = mapValues.reduce((acc, curr) => {
          if(!_.isUndefined(curr[count])) acc.push(curr[count].trim())
          return acc
        }, [])

        count++

        current = _.compact(current)
        
        current.unshift(current.splice(0, current.length - 1).join('-stylejam-'))
        
        if (current[0] != '') obj['#' + current[0]] = current[1]
      }

      return obj
    }

    borders () {

      let borderProps = ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset']
      
      let borderQuery = (prop) => {
        return $((n) => n.node.value === prop).closest('declaration')
      }

      let obj = _.stubObject()

      for (let prop of borderProps) {

        let variables = borderQuery(prop).closest('declaration').find('variable').hasParent('property').map((n) => {
          return $(n).value()
        })

        let values = borderQuery(prop).closest('declaration').has('variable').find('value').map((n) => {
          return stringify($(n).get(0))
        })

        if(variables.length > 0) {
          variables.forEach((val, idx) => {
            obj['#' + val] = values[idx]
          })
        }

        variables = []
        values = []
      }

     return obj
    }

    colorVars() {
      let obj = Object.create(null)

      let colorVars = $('stylesheet')
        .children('declaration')
        .children('property')
        .has('variable').filter((n) => {
          return $(n).closest('declaration').has('parentheses').length() === 0
        }).closest('declaration').each((n) => {
        if(!_.isUndefined(n)) { 
          obj['#' + $(n).find('variable').eq(0).value()] = stringify($(n).children('value').get(0)).trim()
        }
      })

      return obj
    }

    /**
     * Return a new wrapper filtered by a selector
     *
     * @private
     * @param {NodeWrapper[]} nodes
     * @param {function} selector
     * @returns {QueryWrapper}
     */
    $filter (nodes, selector) {
      nodes = nodes.filter(selector)
      return $(nodes)
    }
    /**
     * Return the wrapper as a JSON node or array of JSON nodes
     *
     * @param {number} [index]
     * @returns {object|object[]}
     */
    get (index) {
      return _.isInteger(index)
        ? this.nodes[index].toJSON()
        : this.nodes.map((n) => n.toJSON())
    }
    /**
     * Return the number of nodes in the wrapper
     *
     * @returns {number}
     */
    length () {
      return this.nodes.length
    }
    /**
     * Search for a given node in the set of matched nodes.
     *
     * If no argument is passed, the return value is an integer indicating
     * the position of the first node within the Wrapper relative
     * to its sibling nodes.
     *
     * If called on a collection of nodes and a NodeWrapper is passed in, the return value
     * is an integer indicating the position of the passed NodeWrapper relative
     * to the original collection.
     *
     * If a selector is passed as an argument, the return value is an integer
     * indicating the position of the first node within the Wrapper relative
     * to the nodes matched by the selector.
     *
     * If the selctor doesn't match any nodes, it will return -1.
     *
     * @param {NodeWrapper|Wrapper~Selector} [node]
     * @returns {number}
     */
    index (node) {
      if (!node) {
        let n = this.nodes[0]
        if (n) {
          let p = n.parent
          if (p && p.hasChildren) return p.children.indexOf(n)
        }
        return -1
      }
      if (NodeWrapper.isNodeWrapper(node)) {
        return this.nodes.indexOf(node)
      }
      let n = this.nodes[0]
      let p = n.parent
      if (!p.hasChildren) return -1
      let selector = getSelector(node)
      return this.$filter(p.children, selector).index(this.nodes[0])
    }
    /**
     * Insert a node after each node in the set of matched nodes
     *
     * @param {object} node
     * @returns {QueryWrapper}
     */
    after (node) {
      for (let n of this.nodes) {
        let p = n.parent
        if (!p.hasChildren) continue
        let i = $(n).index()
        if (i >= 0) p.children.splice(i + 1, 0, NodeWrapper.create(node, p))
      }
      return this
    }
    /**
     * Insert a node before each node in the set of matched nodes
     *
     * @param {object} node
     * @returns {QueryWrapper}
     */
    before (node) {
      for (let n of this.nodes) {
        let p = n.parent
        if (!p.hasChildren) continue
        let i = p.children.indexOf(n)
        if (i >= 0) p.children.splice(i, 0, NodeWrapper.create(node, p))
      }
      return this
    }
    /**
     * Remove the set of matched nodes
     *
     * @returns {QueryWrapper}
     */
    remove () {
      for (let n of this.nodes) {
        let p = n.parent
        if (!p.hasChildren) continue
        let i = p.children.indexOf(n)
        if (i >= 0) p.children.splice(i, 1)
      }
      return this
    }
    /**
     * Replace each node in the set of matched nodes by returning a new node
     * for each node that will be replaced
     *
     * @param {function} fn
     * @returns {QueryWrapper}
     */
    replace (fn) {
      for (let n of this.nodes) {
        let p = n.parent
        if (!p.hasChildren) continue
        let i = p.children.indexOf(n)
        if (i >= 0) p.children.splice(i, 1, NodeWrapper.create(fn(n), p))
      }
      return this
    }
    /**
     * Map the set of matched nodes
     *
     * @param {function} fn
     * @returns {array}
     */
    map (fn) {
      return this.nodes.map(fn)
    }
    /**
     * Execute a function on each node in matched nodes
     *
     * @param {function} fn
     * @returns {any}
     */
    each (fn) {
      return this.nodes.forEach(fn)
    }
    /**
     * Reduce the set of matched nodes
     *
     * @param {function} fn
     * @param {any} acc
     * @returns {any}
     */
    reduce (fn, acc) {
      return this.nodes.reduce(fn, acc)
    }
    /**
     * Combine the nodes of two QueryWrappers
     *
     * @param {QueryWrapper} wrapper
     * @returns {any}
     */
    concat (wrapper) {
      invariant(wrapper instanceof QueryWrapper,
        'concat requires a QueryWrapper')
      return $(this.nodes.concat(wrapper.nodes))
    }
    /**
     * Get the children of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    children (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => n.hasChildren ? n.children : [])
      return this.$filter(nodes, selector)
    }
    /**
     * For each node in the set of matched nodes, get the first node that matches
     * the selector by testing the node itself and traversing up through its ancestors
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    closest (selector) {
      selector = getSelector(selector)
      let nodes = _.uniq(_.flatMap(this.nodes, (n) => {
        let parent = n
        while (parent) {
          if (selector(parent)) break
          parent = parent.parent
        }
        return parent || []
      }))
      return $(nodes)
    }
    /**
     * Reduce the set of matched nodes to the one at the specified index
     *
     * @param {number} index
     * @returns {QueryWrapper}
     */
    eq (index) {
      invariant(_.isInteger(index),
        'eq() requires an index')
      return $(this.nodes[index] || [])
    }
    /**
     * Get the descendants of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    find (selector) {
      selector = getSelector(selector)
      let nodes = _.uniq(_.flatMap(this.nodes, (n) =>
        n.reduce((a, n) => selector(n) ? a.concat(n) : a, [])))
      return $(nodes)
    }
    /**
     * Reduce the set of matched nodes to those that match the selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    filter (selector) {
      selector = getSelector(selector)
      return this.$filter(this.nodes, selector)
    }
    /**
     * Reduce the set of matched nodes to the first in the set.
     *
     * @returns {QueryWrapper}
     */
    first () {
      return this.eq(0)
    }
    /**
     * Reduce the set of matched nodes to those that have a descendant
     * that matches the selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    has (selector) {
      let filter = (n) => $(n).find(selector).length() > 0
      return this.$filter(this.nodes, filter)
    }
    /**
     * Reduce the set of matched nodes to those that have a parent
     * that matches the selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    hasParent (selector) {
      let filter = (n) => $(n).parent(selector).length() > 0
      return this.$filter(this.nodes, filter)
    }
    /**
     * Reduce the set of matched nodes to those that have an ancestor
     * that matches the selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    hasParents (selector) {
      let filter = (n) => $(n).parents(selector).length() > 0
      return this.$filter(this.nodes, filter)
    }
    /**
     * Reduce the set of matched nodes to the final one in the set
     *
     * @returns {QueryWrapper}
     */
    last () {
      return this.eq(this.length() - 1)
    }
    /**
     * Get the immediately following sibling of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    next (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => {
        let index = this.index()
        return index >= 0 && index < n.parent.children.length - 1
          ? n.parent.children[index + 1] : []
      })
      return this.$filter(nodes, selector)
    }
    /**
     * Get all following siblings of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    nextAll (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => {
        let index = this.index()
        return index >= 0 && index < n.parent.children.length - 1
          ? _.drop(n.parent.children, index + 1) : []
      })
      return this.$filter(nodes, selector)
    }
    /**
     * Get the parent of each nodes in the current set of matched nodess,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    parent (selector) {
      selector = getSelector(selector)
      let nodes = this.nodes.map((n) => n.parent)
      return this.$filter(nodes, selector)
    }
    /**
     * Get the ancestors of each nodes in the current set of matched nodess,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    parents (selector) {
      selector = getSelector(selector)
      let nodes = _.uniq(_.flatMap(this.nodes, (n) => {
        let parents = []
        let parent = n.parent
        while (parent) {
          parents.push(parent)
          parent = parent.parent
        }
        return parents
      }))
      return this.$filter(nodes, selector)
    }
    /**
     * Get the ancestors of each node in the set of matched nodes,
     * up to but not including the node matched by the selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    parentsUntil (selector) {
      selector = getSelector(selector)
      let nodes = _.uniq(_.flatMap(this.nodes, (n) => {
        let parents = []
        let parent = n.parent
        while (parent && !selector(parent)) {
          parents.push(parent)
          parent = parent.parent
        }
        return parents
      }))
      return $(nodes)
    }
    /**
     * Get the immediately preceding sibling of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    prev (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => {
        let index = this.index()
        return index > 0 ? n.parent.children[index - 1] : []
      })
      return this.$filter(nodes, selector)
    }
    /**
     * Get all preceding siblings of each node in the set of matched nodes,
     * optionally filtered by a selector
     *
     * @param {Wrapper~Selector} [selector]
     * @returns {QueryWrapper}
     */
    prevAll (selector) {
      selector = getSelector(selector)
      let nodes = _.flatMap(this.nodes, (n) => {
        let index = this.index()
        return index > 0 ? _.take(n.parent.children, index).reverse() : []
      })
      return this.$filter(nodes, selector)
    }
    /**
     * Get the combined string contents of each node in the set of matched nodes,
     * including their descendants
     */
    value () {
      return this.nodes.reduce((v, n) => {
        return n.reduce((v, n) => {
          return v + toString(n.node)
        }, v)
      }, '')
    }
  }

  return $
}
