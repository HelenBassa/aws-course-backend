# Task 4 (Integration with NoSQL Database)

### Link to Product Service API - https://d1v4qmrdh4.execute-api.us-east-1.amazonaws.com
Add `/products` or `/products/{productId}` in the end. For example:
`/products` - https://d1v4qmrdh4.execute-api.us-east-1.amazonaws.com/products
`/products/{productId}` - https://d1v4qmrdh4.execute-api.us-east-1.amazonaws.com/products/8dc6d3e1-2d52-4d43-bef6-2931d717f6c8 (for example).

- [x]  Link to FE PR (YOUR OWN REPOSITORY) - https://github.com/HelenBassa/nodejs-aws-shop-react/pull/3
- [x] **Link to Frontend app - https://d202mox6ze7nec.cloudfront.net/**

## Tasks

---

### Task 4.1

- [x] Use AWS Console to create two database tables in DynamoDB. Expected schemas for products and stocks:

Product model:

```
  products:
    id -  uuid (Primary key)
    title - text, not null
    description - text
    price - integer
```

Stock model:

```
  stocks:
    product_id - uuid (Foreign key from products.id)
    count - integer (Total number of products in stock, can't be exceeded)
```

- [x] Write a script to fill tables with test examples. Store it in your Github repository. Execute it for your DB to fill data.
`aws dynamodb batch-write-item --request-items file://writeItemsProductDB.json`
`aws dynamodb batch-write-item --request-items file://writeItemsStockDB.json`

### Task 4.2

- [x] Extend your AWS CDK Stack with data about your database table and pass it to lambda’s environment variables section.
- [x] Integrate the `getProductsList` lambda to return via GET `/products` request a list of products from the database (joined stocks and products tables). Link to Product Service API - https://d1v4qmrdh4.execute-api.us-east-1.amazonaws.com/products
- [x] Implement a Product model on FE side as a joined model of product and stock by `productId`. For example:

_BE: Separate tables in DynamoDB_

```
  Stock model example in DB:
  {
    product_id: '19ba3d6a-f8ed-491b-a192-0a33b71b38c4',
    count: 2
  }


  Product model example in DB:
  {
    id: '19ba3d6a-f8ed-491b-a192-0a33b71b38c4'
    title: 'Product Title',
    description: 'This product ...',
    price: 200
  }
```

_FE: One product model as a result of BE models join (product and it's stock)_

```
  Product model example on Frontend side:
  {
    id: '19ba3d6a-f8ed-491b-a192-0a33b71b38c4',
    count: 2
    price: 200,
    title: ‘Product Title’,
    description: ‘This product ...’
  }
```

_NOTE: This setup means User cannot buy more than `product.count` (no more items in stock) - but this is future functionality on FE side._

- [x] Integrate the `getProductsById` lambda to return via GET `/products/{productId}` request a single product from the database. Link - https://d1v4qmrdh4.execute-api.us-east-1.amazonaws.com/products/8dc6d3e1-2d52-4d43-bef6-2931d717f6c8

### Task 4.3

- [x] Create a lambda function called `createProduct` under the Product Service which will be triggered by the HTTP POST method.
- [x] The requested URL should be `/products`.
- [x] Implement its logic so it will be creating a new item in a Products table.
- [x] Save the URL (API Gateway URL) to execute the implemented lambda functions for later - you'll need to provide it in the PR (e.g in PR's description) when submitting the task.

### Task 4.4

- [x] Commit all your work to separate branch (e.g. `task-4` from the latest `master`) in BE (backend) and if needed in FE (frontend) repositories.
- [x] Create a pull request to the `master` branch.
- [x] Submit link to the pull request to Crosscheck page in [RS App](https://app.rs.school).

## Evaluation criteria (70 points for covering all criteria)

---

Reviewers should verify the lambda functions by invoking them through provided URLs.

- [x] Task 4.1 is implemented
- [x] Task 4.2 is implemented lambda links are provided and returns data
- [x] Task 4.3 is implemented lambda links are provided and products is stored in DB (call Task 4.2 to see the product)
- [x] Your own Frontend application is integrated with Product Service (`/products` API) and products from Product Service are represented on Frontend. Link to a working Frontend application is provided for cross-check reviewer - https://d202mox6ze7nec.cloudfront.net/

## Additional (optional) tasks

---

- [x] **+6** **(All languages)** - POST `/products` lambda functions returns error 400 status code if product data is invalid
- [x] **+6** **(All languages)** - All lambdas return error 500 status code on any error (DB connection, any unhandled error in code)
- [x] **+6** **(All languages)** - All lambdas do `console.log` for each incoming requests and their arguments
- [ ] **+6** **(All languages)** - Use RDS instance instead of DynamoDB tables. **Do not commit your environment variables to github!**
- [ ] **+6** **(All languages)** - Transaction based creation of product (in case stock creation is failed then related to this stock product is not created and not ready to be used by the end user and vice versa) (https://devcenter.kinvey.com/nodejs/tutorials/bl-transactional-support, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)

