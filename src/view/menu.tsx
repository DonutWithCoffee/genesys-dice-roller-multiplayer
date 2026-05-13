import * as React from "react";

import { Theme } from "src/model/settings";

type MenuProps = {
  toggleCallback?: (open: boolean) => void;
};

type MenuState = {
  theme: "light" | "dark" | "";
};

export default class Menu extends React.PureComponent<MenuProps, MenuState> {
  state: MenuState = {
    theme: Theme.get() || ""
  };

  handleTheme = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const theme = e.target.value as "light" | "dark" | "";

    this.setState({ theme });
    Theme.set(theme || null);
  };

  render() {
    return <div className="menu">
      <label>Тема
        <select value={this.state.theme} onChange={this.handleTheme}>
          <option value="">Системная</option>
          <option value="light">Светлая</option>
          <option value="dark">Тёмная</option>
        </select>
      </label>

      {this.props.toggleCallback &&
        <button onClick={() => this.props.toggleCallback!(false)}>Закрыть</button>}
    </div>;
  }
}