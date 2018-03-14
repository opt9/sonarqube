/*
 * SonarQube
 * Copyright (C) 2009-2018 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import * as React from 'react';
import * as classNames from 'classnames';
import { difference } from 'lodash';
import MultiSelectOption from './MultiSelectOption';
import SearchBox from '../controls/SearchBox';

export interface MultiSelectValue {
  key: string;
  label: string;
}
interface Props {
  alertMessage?: string;
  allowNewElements?: boolean;
  allowSelection?: boolean;
  displayAlertMessage?: boolean;
  elements: MultiSelectValue[];
  listSize?: number;
  onSearch: (query: string) => Promise<void>;
  onSelect: (item: MultiSelectValue) => void;
  onUnselect: (item: MultiSelectValue) => void;
  placeholder: string;
  selectedElements: MultiSelectValue[];
  validateSearchInput?: (value: string) => string;
}

interface State {
  activeIdx: number;
  loading: boolean;
  query: string;
  selectedElements: MultiSelectValue[];
  unselectedElements: MultiSelectValue[];
}

interface DefaultProps {
  listSize: number;
  validateSearchInput: (value: string) => string;
}

type PropsWithDefault = Props & DefaultProps;

export default class MultiSelect extends React.PureComponent<Props, State> {
  container?: HTMLDivElement | null;
  searchInput?: HTMLInputElement | null;
  mounted = false;

  static defaultProps: DefaultProps = {
    listSize: 0,
    validateSearchInput: (value: string) => value
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      activeIdx: 0,
      loading: true,
      query: '',
      selectedElements: [],
      unselectedElements: []
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.onSearchQuery('');
    this.updateSelectedElements(this.props);
    this.updateUnselectedElements(this.props as PropsWithDefault);
    if (this.container) {
      this.container.addEventListener('keydown', this.handleKeyboard, true);
    }
  }

  componentWillReceiveProps(nextProps: PropsWithDefault) {
    if (
      this.props.elements !== nextProps.elements ||
      this.props.selectedElements !== nextProps.selectedElements
    ) {
      this.updateSelectedElements(nextProps);
      this.updateUnselectedElements(nextProps);

      const totalElements = this.getAllElements(nextProps, this.state).length;
      if (this.state.activeIdx >= totalElements) {
        this.setState({ activeIdx: totalElements - 1 });
      }
    }
  }

  componentDidUpdate() {
    if (this.searchInput) {
      this.searchInput.focus();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    if (this.container) {
      this.container.removeEventListener('keydown', this.handleKeyboard);
    }
  }

  handleSelectChange = (item: MultiSelectValue, selected: boolean) => {
    if (selected) {
      this.onSelectItem(item);
    } else {
      this.onUnselectItem(item);
    }
  };

  handleSearchChange = (value: string) => {
    this.onSearchQuery((this.props as PropsWithDefault).validateSearchInput(value));
  };

  handleElementHover = (element: MultiSelectValue) => {
    this.setState((prevState, props) => {
      return { activeIdx: this.getAllElements(props, prevState).indexOf(element) };
    });
  };

  handleKeyboard = (evt: KeyboardEvent) => {
    switch (evt.keyCode) {
      case 40: // down
        evt.stopPropagation();
        evt.preventDefault();
        this.setState(this.selectNextElement);
        break;
      case 38: // up
        evt.stopPropagation();
        evt.preventDefault();
        this.setState(this.selectPreviousElement);
        break;
      case 37: // left
      case 39: // right
        evt.stopPropagation();
        break;
      case 13: // enter
        if (this.state.activeIdx >= 0) {
          this.toggleSelect(this.getAllElements(this.props, this.state)[this.state.activeIdx]);
        }
        break;
    }
  };

  onSearchQuery = (query: string) => {
    this.setState({ activeIdx: 0, loading: true, query });
    this.props.onSearch(query).then(this.stopLoading, this.stopLoading);
  };

  onSelectItem = (item: MultiSelectValue) => {
    if (this.isNewElement(item, this.props)) {
      this.onSearchQuery('');
    }
    this.props.onSelect(item);
  };

  onUnselectItem = (item: MultiSelectValue) => this.props.onUnselect(item);

  isNewElement = (elem: MultiSelectValue, { selectedElements, elements }: Props) =>
    elem.key.length > 0 && selectedElements.indexOf(elem) === -1 && elements.indexOf(elem) === -1;

  updateSelectedElements = (props: Props) => {
    this.setState((state: State) => {
      if (state.query) {
        return {
          selectedElements: props.selectedElements.filter(
            elem => elem.key.includes(state.query) || elem.label.includes(state.query)
          )
        };
      } else {
        return { selectedElements: [...props.selectedElements] };
      }
    });
  };

  updateUnselectedElements = (props: PropsWithDefault) => {
    this.setState((state: State) => {
      if (props.listSize === 0) {
        return { unselectedElements: difference(props.elements, props.selectedElements) };
      } else if (props.listSize < state.selectedElements.length) {
        return { unselectedElements: [] };
      } else {
        return {
          unselectedElements: difference(props.elements, props.selectedElements).slice(
            0,
            props.listSize - state.selectedElements.length
          )
        };
      }
    });
  };

  getAllElements = (props: Props, state: State) => {
    if (this.isNewElement({ key: state.query, label: state.query }, props)) {
      return [
        ...state.selectedElements,
        ...state.unselectedElements,
        { key: state.query, label: state.query }
      ];
    } else {
      return [...state.selectedElements, ...state.unselectedElements];
    }
  };

  setElementActive = (idx: number) => this.setState({ activeIdx: idx });

  selectNextElement = (state: State, props: Props) => {
    const { activeIdx } = state;
    const allElements = this.getAllElements(props, state);
    if (activeIdx < 0 || activeIdx >= allElements.length - 1) {
      return { activeIdx: 0 };
    } else {
      return { activeIdx: activeIdx + 1 };
    }
  };

  selectPreviousElement = (state: State, props: Props) => {
    const { activeIdx } = state;
    const allElements = this.getAllElements(props, state);
    if (activeIdx <= 0) {
      const lastIdx = allElements.length - 1;
      return { activeIdx: lastIdx };
    } else {
      return { activeIdx: activeIdx - 1 };
    }
  };

  stopLoading = () => {
    if (this.mounted) {
      this.setState({ loading: false });
    }
  };

  toggleSelect = (item: MultiSelectValue) => {
    if (this.props.selectedElements.indexOf(item) === -1) {
      this.onSelectItem(item);
    } else {
      this.onUnselectItem(item);
    }
  };

  render() {
    const {
      allowSelection = true,
      allowNewElements = true,
      displayAlertMessage = false,
      alertMessage = ''
    } = this.props;
    const { query, activeIdx, selectedElements, unselectedElements } = this.state;
    const activeElement = this.getAllElements(this.props, this.state)[activeIdx];
    const infiniteList = this.props.listSize === 0;
    const listClasses = classNames('menu', {
      'menu-vertically-limited': infiniteList,
      'spacer-top': infiniteList,
      'with-top-separator': infiniteList,
      'with-bottom-separator': displayAlertMessage
    });

    return (
      <div className="multi-select" ref={div => (this.container = div)}>
        <div className="menu-search">
          <SearchBox
            autoFocus={true}
            className="little-spacer-top"
            loading={this.state.loading}
            onChange={this.handleSearchChange}
            placeholder={this.props.placeholder}
            value={query}
          />
        </div>
        <ul className={listClasses}>
          {selectedElements.length > 0 &&
            selectedElements.map(element => (
              <MultiSelectOption
                active={activeElement === element}
                element={element}
                key={element.key}
                onHover={this.handleElementHover}
                onSelectChange={this.handleSelectChange}
                selected={true}
              />
            ))}
          {unselectedElements.length > 0 &&
            unselectedElements.map(element => (
              <MultiSelectOption
                active={activeElement === element}
                disabled={!allowSelection}
                element={element}
                key={element.key}
                onHover={this.handleElementHover}
                onSelectChange={this.handleSelectChange}
              />
            ))}
          {allowNewElements &&
            this.isNewElement({ key: query, label: query }, this.props) && (
              <MultiSelectOption
                active={activeElement === { key: query, label: query }}
                custom={true}
                element={{ key: query, label: query }}
                key={query}
                onHover={this.handleElementHover}
                onSelectChange={this.handleSelectChange}
              />
            )}
        </ul>
        {displayAlertMessage && (
          <span className="alert alert-info spacer-left spacer-right spacer-top">
            {alertMessage}
          </span>
        )}
      </div>
    );
  }
}
