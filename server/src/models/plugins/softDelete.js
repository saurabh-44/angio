import { Schema, Types } from 'mongoose';

function injectFilter(query) {
  if (query.getOptions().withDeleted) return;
  const filter = query.getFilter();
  if (Object.prototype.hasOwnProperty.call(filter, 'isDeleted')) return;
  query.where({ isDeleted: { $ne: true } });
}

export function softDeletePlugin(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId },
  });

  const readHooks = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'count',
    'countDocuments',
    'estimatedDocumentCount',
    'distinct',
  ];
  for (const hook of readHooks) {
    schema.pre(hook, function () {
      injectFilter(this);
    });
  }

  schema.pre('aggregate', function () {
    if (this.options?.withDeleted) return;
    const first = this.pipeline()[0];
    if (first?.$match && Object.prototype.hasOwnProperty.call(first.$match, 'isDeleted')) {
      return;
    }
    this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
  });

  schema.statics.softDeleteById = async function (id, deletedBy) {
    const _id = typeof id === 'string' ? new Types.ObjectId(id) : id;
    return this.updateOne(
      { _id, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy ? new Types.ObjectId(String(deletedBy)) : undefined,
        },
      },
    );
  };

  schema.statics.softDeleteMany = async function (filter, deletedBy) {
    return this.updateMany(
      { ...filter, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy ? new Types.ObjectId(String(deletedBy)) : undefined,
        },
      },
    );
  };
}
