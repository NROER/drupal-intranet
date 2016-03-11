README.txt
==========

This module creates a new widget for the Facet API (https://www.drupal.org/project/facetapi) that will place the normal Facet links into a Bootstrap Dropdown.



Dependencies
============

Facet API (I think that this is a given) (https://www.drupal.org/project/facetapi)
Bootstrap or it requires Bootstrap to be loaded in the site to work (See Notes Below) (https://www.drupal.org/project/bootstrap)



Install
=======
Install like normal Drupal Modules, see this guide for more information. (https://www.drupal.org/documentation/install/modules-themes/modules-7)



Configure
=========

Navigate to "Configure Display" for your Facet
Under "Display widget" choose "Bootstrap Dropdown"
Enjoy the extra screen space that you now have by putting your FacetAPI links into a Dropdown element
Related projects

We gathered inspiration from various other display widgets from the Facet API project page. (None of these related projects make an actual Bootstrap Dropdown which is just a hidden list full of links, they do more select element type changes but they are related and you do have a choice.)

Facet API Multi-select (https://www.drupal.org/project/facetapi_multiselect)
Facet API Collapsible (https://www.drupal.org/project/facetapi_collapsible)
Facet API Select (https://www.drupal.org/project/facetapi_select)
Facet API Chosen Sandbox (https://www.drupal.org/sandbox/sammyd56/1353462)



Notes
=====

This module requires a Bootstrap Theme and has only been tested with Bootstrap at this time. We are not adding Bootstrap as a dependency in the code though (It is listed above) since technically as long as Bootstrap is loaded on your site then the dropdown would still work.



Supporting Organizations
========================

Breakthrough Technologies, LLC
Development, Maintenance



Developer Notes
===============

Markup Provided by FacetAPI Bootstrap Dropdown.
<div class="dropdown">
  <button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
    Dropdown
    <span class="caret"></span>
  </button>
  <ul class="dropdown-menu" aria-labelledby="dropdownMenu1">
   <li><a href="#">Action</a></li>
   <li><a href="#">Another action</a></li>
   <li><a href="#">Something else here</a></li>
   <li><a href="#">Separated link</a></li>
 </ul>
</div>



Issues
======

If any issues arise while using this module please see the issue queue (https://www.drupal.org/project/issues/2558037?categories=All) first and then file an issue if your issue is not present.



Roadmap
=======

Clean up code and get ready for release.
Turn into full project.
Make a Stable release.
Document excactly how to make new display widgets b/c it is not well documented.
Get rid of the actual Bootstrap Dependency, if possible.
Add more settings like a dropup instead of a dropdown :)



Maintainers
==========
Jeremy Burns (burnsjeremy)(https://www.drupal.org/u/burnsjeremy)
