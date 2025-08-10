# JavaScript 面试题：`var`、`let` 与 `const` 的终极区别

## 一、前言：历史成因

在 JavaScript 中，我们有三个关键字可以用来声明变量：`var`、`let` 和 `const`。这种多样性是由 JavaScript 的发展历史造成的。

  - **ES5 及之前**: 只有 `var` 关键字。
  - **ES6 (ECMAScript 2015)**: 新增了 `let` 和 `const`，旨在解决 `var` 存在的一些固有缺陷和问题。

## 二、核心概念前置：作用域 (Scope)

在深入理解三个关键字的区别之前，必须先理解“作用域”的概念。作用域定义了变量和函数在代码中可被访问的范围。

### 1\. ES6 之前的作用域 (ES5)

  - **全局作用域 (Global Scope)**: 在代码的任何地方都能被访问到的作用域。在顶层声明的变量即位于全局作用域。
    ```javascript
    // i 在全局作用域中，整个脚本都可以访问
    var i = 1;
    console.log(i); // 1
    ```
  - **函数作用域 (Function Scope)**: 变量只在声明它的函数内部及其子函数内部可用。
    ```javascript
    function test() {
      // j 的作用域仅限于 test 函数内部
      var j = 2;
      console.log(j); // 2
    }
    test();
    console.log(j); // Uncaught ReferenceError: j is not defined
    ```

### 2\. ES6 新增的作用域

  - **块级作用域 (Block Scope)**: ES6 引入的概念。任何被花括号 `{}` 包裹的区域都是一个块级作用域，例如 `if` 语句、`for` 循环，甚至一个独立的 `{}`。`let` 和 `const` 声明的变量就具有块级作用域。

    **对比示例：**

    ```javascript
    // 使用 var，没有块级作用域的概念
    {
      var a = 1;
    }
    console.log(a); // 1, 在块外部依然可以访问

    // 使用 let，存在块级作用域
    {
      let b = 2;
    }
    console.log(b); // Uncaught ReferenceError: b is not defined
    ```

-----

## 三、关键字详解

### `var` 的特性

1.  **作用域**：只有 **全局作用域** 和 **函数作用域**，**没有块级作用域**。

2.  **变量提升 (Hoisting)**

      - **定义**：使用 `var` 声明的变量，其**声明部分**会被提升到其所在作用域的顶部，但赋值操作会留在原地。
      - **表现**：在变量声明之前访问该变量，不会报错 `ReferenceError`，而是得到 `undefined`。

    <!-- end list -->

    ```javascript
    console.log(myVar); // 输出: undefined
    var myVar = 10;
    ```

    上述代码在 JavaScript 引擎解析后，等价于：

    ```javascript
    var myVar; // 声明被提升到作用域顶部
    console.log(myVar); // 此刻 myVar 尚未赋值，故为 undefined
    myVar = 10; // 赋值操作留在原地
    ```

3.  **挂载于 `window` 对象**

      - 在全局作用域中，使用 `var` 声明的变量会自动成为 `window` 对象的属性。

    <!-- end list -->

    ```javascript
    var globalVar = 'I am global';
    console.log(window.globalVar); // 'I am global'
    ```

4.  **允许重复声明**

      - 在同一作用域内，使用 `var` 多次声明同一个变量是合法的，后面的声明会覆盖前面的。

    <!-- end list -->

    ```javascript
    var x = 10;
    var x = 20; // 合法，x 的值现在是 20
    console.log(x); // 20
    ```

5.  **默认值**

      - 如果不进行初始化，默认值为 `undefined`。

    <!-- end list -->

    ```javascript
    var z;
    console.log(z); // undefined
    ```

### `let` 的特性

`let` 是对 `var` 的改进，解决了 `var` 的许多问题。

1.  **作用域**：具有 **块级作用域**。变量只在声明它的代码块 (`{}`) 内有效。

2.  **不存在变量提升（暂时性死区）**

      - **暂时性死区 (Temporal Dead Zone, TDZ)**：虽然 `let` 声明的变量在底层实现上也会被“提升”，但在代码块内，从块的开始到变量声明语句的这块区域，被称为“暂时性死区”。在此区域内访问该变量会抛出 `ReferenceError`。
      - **核心**：必须 **先声明，后使用**。

    <!-- end list -->

    ```javascript
    console.log(myLet); // Uncaught ReferenceError: Cannot access 'myLet' before initialization
    let myLet = 10;
    ```

    > **注意**：报错信息是 `Cannot access 'X' before initialization` (无法在初始化前访问)，而不是 `X is not defined` (未定义)。这说明引擎知道变量的存在，但由于 TDZ 的规则，暂时不允许访问。

3.  **不挂载于 `window` 对象**

      - 在全局作用域中，使用 `let` 声明的变量不会成为 `window` 对象的属性。

    <!-- end list -->

    ```javascript
    let globalLet = 'I am not on window';
    console.log(window.globalLet); // undefined
    ```

4.  **不允许重复声明**

      - 在同一作用域内（无论是全局、函数还是块级），`let` 不允许重复声明同一个变量。

    <!-- end list -->

    ```javascript
    let y = 10;
    let y = 20; // Uncaught SyntaxError: Identifier 'y' has already been declared
    ```

5.  **默认值**

      - 如果不进行初始化，默认值为 `undefined`。

    <!-- end list -->

    ```javascript
    let w;
    console.log(w); // undefined
    ```

### `const` 的特性

`const` 的行为与 `let` 基本一致，但有两大核心区别。

1.  **必须立即初始化**

      - 使用 `const` 声明变量时，**必须在声明的同时进行赋值**，否则会抛出语法错误。

    <!-- end list -->

    ```javascript
    const PI; // Uncaught SyntaxError: Missing initializer in const declaration
    ```

2.  **声明常量 (Constant)**

      - `const` 用于声明一个只读的常量。一旦声明，其\*\*值（对于原始类型）或引用（对于对象类型）\*\*就不能再被改变。
      - 尝试重新赋值会抛出 `TypeError`。

    <!-- end list -->

    ```javascript
    const PI = 3.14159;
    PI = 3.14; // Uncaught TypeError: Assignment to constant variable.

    // --- 对于对象和数组 ---
    // const 保证的是变量指向的内存地址不改变，但可以修改该地址中存储的内容（对象的属性或数组的元素）
    const person = {
        name: 'Alex'
    };

    // 合法操作：修改对象的属性
    person.name = 'Bob';
    console.log(person.name); // 'Bob'

    // 非法操作：尝试将 person 指向一个新对象
    person = { name: 'Charlie' }; // Uncaught TypeError: Assignment to constant variable.
    ```

3.  **其他特性 (与 `let` 相同)**

      - 具有**块级作用域**。
      - 存在**暂时性死区 (TDZ)**。
      - **不挂载**于 `window` 对象。
      - **不允许重复声明**。

-----

## 四、总结与面试回答

### 快速对比表

| 特性 | `var` | `let` | `const` |
| :--- | :--- | :--- | :--- |
| **作用域** | 函数/全局 | **块级** | **块级** |
| **变量提升** | ✅ (值为 `undefined`) | ❌ (存在 **TDZ**) | ❌ (存在 **TDZ**) |
| **重复声明** | ✅ (允许) | ❌ (不允许) | ❌ (不允许) |
| **挂载 `window`** | ✅ (全局作用域) | ❌ | ❌ |
| **声明时初始化**| ❌ (可选) | ❌ (可选) | ✅ (**必须**) |
| **重新赋值** | ✅ (可以) | ✅ (可以) | ❌ (**不允许**) |

### 面试问题解答

> **问：`var`、`let`、`const` 的区别是什么？什么是块级作用域？**

**答：**

`var`、`let` 和 `const` 是 JavaScript 中用来声明变量的三个关键字，它们主要的区别在于作用域、变量提升、重复声明和赋值规则。

1.  **`var`**：

      * 它是 ES6 之前唯一的声明方式，具有**函数作用域**或**全局作用域**，没有块级作用域。
      * 存在**变量提升**，即变量可以在声明前被访问，值为 `undefined`。
      * 在全局作用域下声明的变量会成为 `window` 对象的属性。
      * 允许在同一作用域内**重复声明**同一个变量。

2.  **`let`**：

      * 是 ES6 新增的命令，用于声明变量。它最大的特点是引入了**块级作用域**。
      * 不存在变量提升，而是有**暂时性死区 (TDZ)**，在声明前访问会直接报错。
      * 不允许在同一作用域内**重复声明**。
      * 不会挂载到 `window` 对象上。

3.  **`const`**：

      * 也是 ES6 新增的，用于声明一个**只读常量**。它的特性与 `let` 基本相同：拥有**块级作用域**、存在**暂时性死区**、不允许重复声明。
      * 但有两个关键不同点：
        1.  声明时**必须立即初始化**。
        2.  一旦声明，其**值不能被重新赋值**。对于对象或数组，意味着其引用地址不能改变，但其内部的属性或元素是可以修改的。

**关于块级作用域：**

> 块级作用域是指由一对花括号 `{}` 包裹的区域，比如 `if` 语句、`for` 循环或者一个单独的代码块。在 ES6 之前，JavaScript 没有块级作用域，这会导致一些问题，比如在 `for` 循环中用 `var` 声明的变量会泄露到循环外部。ES6 中的 `let` 和 `const` 遵循块级作用域，使得变量的生命周期更可控，代码更健壮。

**使用建议：**

在现代 JavaScript 开发中，推荐的实践是：**优先使用 `const`**，当变量需要被重新赋值时，再使用 `let`。尽量**避免使用 `var`**，以减少因变量提升和作用域问题引发的潜在 bug。