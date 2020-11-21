const { Keystone } = require('@keystonejs/keystone');
const { PasswordAuthStrategy } = require('@keystonejs/auth-password');
const { Text, Checkbox, Password, Relationship  } = require('@keystonejs/fields');
const { GraphQLApp } = require('@keystonejs/app-graphql');
const { AdminUIApp } = require('@keystonejs/app-admin-ui');
const initialiseData = require('./initial-data');

const { MongooseAdapter: Adapter } = require('@keystonejs/adapter-mongoose');
const PROJECT_NAME = 'red-consumo';
const adapterConfig = { mongoUri: 'mongodb://localhost/red-consumo' };


const keystone = new Keystone({
  adapter: new Adapter(adapterConfig),
  onConnect: process.env.CREATE_TABLES !== 'true' && initialiseData,
});

// Access control functions
const userIsAdmin = ({ authentication: { item: user } }) => Boolean(user && user.isAdmin);
const userOwnsItem = ({ authentication: { item: user } }) => {
  if (!user) {
    return false;
  }

  // Instead of a boolean, you can return a GraphQL query:
  // https://www.keystonejs.com/api/access-control#graphqlwhere
  return { id: user.id };
};

const userIsAdminOrOwner = auth => {
  const isAdmin = access.userIsAdmin(auth);
  const isOwner = access.userOwnsItem(auth);
  return isAdmin ? isAdmin : isOwner;
};

const access = { userIsAdmin, userOwnsItem, userIsAdminOrOwner };

keystone.createList('User', {
  fields: {
    name: { type: Text },
    email: {
      type: Text,
      isUnique: true,
    },
    isAdmin: {
      type: Checkbox,
      // Field-level access controls
      // Here, we set more restrictive field access so a non-admin cannot make themselves admin.
      access: {
        update: access.userIsAdmin,
      },
    },
    password: {
      type: Password,
    },
  },
  // List-level access controls
  access: {
    read: access.userIsAdminOrOwner,
    update: access.userIsAdminOrOwner,
    create: access.userIsAdmin,
    delete: access.userIsAdmin,
    auth: true,
  },
});

keystone.createList('Proyecto', {
  fields: {
    name: {
      type: Text
    },
    intengrates: {
      type: Relationship,
      ref: 'User',
      many: true
    },
    productos: {
      type: Relationship,
      ref: 'Producto',
      many: true
    }
  }
})

keystone.createList('Producto', {
  fields: {
    name: {
      type: Text
    },
    proyecto: {
      type: Relationship,
      ref: 'Proyecto',
    }
  }
})

keystone.createList('Carrito', {
  fields: {
    name: {
      type: Text
    },
    productos: {
      type: Relationship,
      ref: 'Producto',
      many: true
    },
    usuario: {
      type: Relationship,
      ref: 'User',
    }
  }
})

keystone.createList('Comanda', {
  fields: {
    name: {
      type: Text
    },
    productos: {
      type: Relationship,
      ref: 'Producto',
      many: true
    },
    proyecto: {
      type: Relationship,
      ref: 'Proyecto',
    }
  }
})


const authStrategy = keystone.createAuthStrategy({
  type: PasswordAuthStrategy,
  list: 'User',
});

module.exports = {
  keystone,
  apps: [
    new GraphQLApp(),
    new AdminUIApp({
      name: PROJECT_NAME,
      enableDefaultRoute: true,
      authStrategy,
    }),
  ],
};
