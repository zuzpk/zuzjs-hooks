# @zuzjs/ui

The `@zuzjs/ui` library provides a collection of reusable components and blocks designed to streamline your development process. It also includes an automatic CSS generator to help you maintain consistent styling across your application.

## Features

- **Components**: A variety of pre-built UI components to speed up your development.
- **Blocks**: Modular blocks that can be easily integrated into your projects.
- **Auto CSS Generator**: Automatically generates CSS to ensure consistent and maintainable styles.

## Installation

To install the `@zuzjs/ui` library, use the following command:

```bash
npm install @zuzjs/ui
```

## Usage

Import the components and blocks you need and start building your UI:

```javascript
import { Box, Button, Text } from '@zuzjs/ui';

function App() {
    return (
        <Box as={`w:100 h:100 bg:red`}>
            <Button as={`s:18 bold tac`}>Click Me</Button>
            <Text as={`s:18 tac`}>Hello World!</Text>
        </Box>
    );
}
```

The auto CSS generator will handle the styling for you, ensuring a cohesive look and feel.

## Documentation

Documention in progress.

## License

This project is licensed under the MIT License.