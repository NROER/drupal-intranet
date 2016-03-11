<?php
/**
 * @file
 * Dropdown Widget Class for FacetAPI Links.
 */



/**
 * Widget that renders facets as a list of clickable links.
 */
class FacetapiBootstrapDropdown extends FacetapiWidgetLinks {

  /**
   * Renders the links.
   */
  public function execute() {
    $element = &$this->build[$this->facet['field alias']];
    $title = $this->build['#facet']['label'];
    // Sets each item's theme hook, builds item list.
    $this->setThemeHooks($element);
    $settings = $this->settings->settings;
    // $keep_open = isset($settings['keep_open']) ? $settings['keep_open'] : 0;
    // $expand = isset($settings['expand']) ? $settings['expand'] : 1;
    // $dropdown_children = isset($settings['dropdown_children']) ? $settings['dropdown_children'] : 0;
    $element = array(
      '#theme' => 'item_list',
      '#items' => $this->buildListItems($element),
      '#prefix' => '<div class="dropdown" id="facet-dropdown-' . str_replace('_', '-', $this->facet['field alias']) . '"><button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' . t('Filter by @title', array('@title' => drupal_strtolower($title))) . '<span class="caret"></span></button>',
      '#suffix' => '</div>',
      '#attributes' => array_merge_recursive($this->build['#attributes'], array('class' => array('dropdown-menu'))),
    );
  }

}
