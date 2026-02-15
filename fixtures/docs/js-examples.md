# JavaScript API Examples

## Get a user with fetch

```javascript
const response = await fetch('/users/123');
const user = await response.json();
```

## Create an item with fetch

```javascript
const response = await fetch('/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Widget' })
});
```

## Update a user with axios

```javascript
const res = await axios.put('/users/456', { name: 'Updated' });
```

## Patch an order with axios

```typescript
const res = await axios.patch('/orders/99', { status: 'shipped' });
```
