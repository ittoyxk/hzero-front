/**
 * 卡片分配租户模态框
 * 每次打开这个模态框 都给一个新的key
 */
import React from 'react';
import { Modal } from 'hzero-ui';
import { Bind } from 'lodash-decorators';
import PropTypes from 'prop-types';
import uuid from 'uuid/v4'; // 用来生成 新增的租户的主键

import EditTable from 'components/EditTable';
import Lov from 'components/Lov';
import { Button as ButtonPermission } from 'components/Permission';

import intl from 'utils/intl';
import {
  getEditTableData,
  createPagination,
  addItemToPagination,
  delItemsToPagination,
} from 'utils/utils';
import notification from 'utils/notification';
import { dateTimeRender } from 'utils/renderer';
import { DEFAULT_DATETIME_FORMAT } from 'utils/constants';

import CardTenantEditSearchForm from './CardTenantEditSearchForm';

export default class CardTenantEditModal extends React.Component {
  static propTypes = {
    onFetchCardTenants: PropTypes.func.isRequired, // 查询卡片已经分配的租户
    onRemoveCardTenants: PropTypes.func.isRequired, // 删除已经分配的卡片
    onOk: PropTypes.func.isRequired, // 保存租户
    onCancel: PropTypes.func.isRequired, // 关闭模态框
    // cardId: PropTypes.number.isRequired, // 当模态框打开时 必须有cardId
  };

  state = {
    // 选中数据
    rowSelection: {
      selectedRowKeys: [],
      selectedRows: [],
      onChange: this.handleRowSelectionChange,
    },
  };

  componentDidMount() {
    // 进来查询卡片已经分配的租户
    this.fetchCardTenants();
  }

  render() {
    const {
      modalProps,
      confirmLoading,
      fetchCardTenantsLoading,
      disabled = true,
      path,
    } = this.props;
    const { dataSource, pagination, rowSelection } = this.state;
    return (
      <Modal
        title={intl.get('hpfm.card.view.title.cardAssign').d('分配卡片')}
        width="1000px"
        wrapClassName="ant-modal-sidebar-right"
        transitionName="move-right"
        confirmLoading={confirmLoading}
        {...modalProps}
        onOk={this.handleModalOkBtnClick}
        onCancel={this.handleModalCancelBtnClick}
        afterClose={this.handleAfterModalClose}
      >
        <div className="table-list-operator" key="search-form">
          <CardTenantEditSearchForm
            onRef={this.handleRefSearchForm}
            onSearch={this.handleSearchBtnClick}
          />
        </div>
        {disabled || (
          <div className="table-operator" key="operator-btns">
            <ButtonPermission
              key="add"
              permissionList={[
                {
                  code: `${path}.button.add`,
                  type: 'button',
                  meaning: '卡片管理-新增',
                },
              ]}
              onClick={this.handleAddBtnClick}
            >
              {intl.get('hzero.common.button.add').d('新增')}
            </ButtonPermission>
            <ButtonPermission
              key="remove"
              disabled={rowSelection.selectedRowKeys.length === 0}
              loading={confirmLoading}
              permissionList={[
                {
                  code: `${path}.button.delete`,
                  type: 'button',
                  meaning: '卡片管理-删除',
                },
              ]}
              onClick={this.handleRemoveBtnClick}
            >
              {intl.get('hzero.common.button.delete').d('删除')}
            </ButtonPermission>
          </div>
        )}
        <EditTable
          key="edit-table"
          bordered
          rowKey="id"
          columns={this.columns}
          scroll={this.scroll}
          onChange={this.handleTableChange}
          loading={fetchCardTenantsLoading}
          pagination={pagination}
          dataSource={dataSource}
          rowSelection={disabled ? null : rowSelection}
        />
      </Modal>
    );
  }

  // Table 相关内容

  @Bind()
  handleTableChange(page, filter, sort) {
    this.fetchCardTenants({ page, sort });
  }

  @Bind()
  handleRowSelectionChange(_, selectedRows) {
    this.setState({
      rowSelection: {
        selectedRows,
        selectedRowKeys: selectedRows.map(r => r.id),
        onChange: this.handleRowSelectionChange,
      },
    });
  }

  @Bind()
  handleAddBtnClick() {
    const { pagination, dataSource } = this.state;
    this.setState({
      dataSource: [{ id: uuid(), _status: 'create' }, ...dataSource],
      pagination: addItemToPagination(dataSource.length, pagination),
    });
  }

  @Bind()
  handleRemoveBtnClick() {
    const {
      rowSelection: { selectedRows },
      dataSource,
      pagination,
    } = this.state;
    const addRows = [];
    const oriRows = [];
    selectedRows.forEach(record => {
      if (record._status === 'create') {
        addRows.push(record);
      } else {
        oriRows.push(record);
      }
    });
    if (oriRows.length > 0) {
      const { onRemoveCardTenants } = this.props;
      // 传 creationDate 给后台 会导致不能删除？ 去掉 creationDate
      onRemoveCardTenants(
        oriRows.map(r => {
          const { creationDate, ...restData } = r;
          return restData;
        })
      ).then(res => {
        if (res) {
          // 删除成功
          notification.success();
          this.setState({
            dataSource: dataSource.filter(r => !selectedRows.some(addR => addR.id === r.id)),
            pagination: delItemsToPagination(selectedRows.length, dataSource.length, pagination),
            rowSelection: {
              selectedRowKeys: [],
              selectedRows: [],
              onChange: this.handleRowSelectionChange,
            },
          });
        }
      });
    } else {
      notification.success();
      this.setState({
        dataSource: dataSource.filter(r => !addRows.some(addR => addR.id === r.id)),
        pagination: delItemsToPagination(addRows.length, dataSource.length, pagination),
        rowSelection: {
          selectedRowKeys: [],
          selectedRows: [],
          onChange: this.handleRowSelectionChange,
        },
      });
    }
  }

  // Modal 相关的内容

  @Bind()
  handleModalOkBtnClick() {
    const { onCancel, onOk, cardId, disabled } = this.props;
    if (disabled) {
      // 禁用状态下 点击 onOk 调用 onCancel
      onCancel();
      return;
    }
    const { dataSource = [] } = this.state;
    const createData = dataSource.filter(r => r._status === 'create');
    if (createData.length > 0) {
      const validateData = getEditTableData(createData, ['id', '_status']);
      if (validateData.length === createData.length) {
        // 校验成功
        onOk(
          validateData.map(r => {
            return { ...r, cardId };
          })
        );
      }
    } else {
      // 没有新增的数据 直接关闭模态框
      onCancel();
    }
  }

  @Bind()
  handleModalCancelBtnClick() {
    const { onCancel } = this.props;
    onCancel();
  }

  @Bind()
  handleAfterModalClose() {
    // 清空查询表单的内容
    this.refSearchForm.props.form.resetFields();
  }

  // 查询相关的内容

  @Bind()
  handleSearchBtnClick() {
    this.fetchCardTenants();
  }

  /**
   * 查询已分配的租户
   */
  @Bind()
  fetchCardTenants(pagination = {}) {
    const { onFetchCardTenants, cardId } = this.props;
    if (cardId !== undefined) {
      let payload = { ...pagination };
      if (this.refSearchForm) {
        // 第一次进来 Modal 做了懒加载? 不会加载 SearchForm
        const { beginDate, endDate, ...params } = this.refSearchForm.props.form.getFieldsValue();
        payload = { ...payload, ...params };
        if (beginDate) {
          payload.beginDate = beginDate.format(DEFAULT_DATETIME_FORMAT);
        }
        if (endDate) {
          payload.endDate = endDate.format(DEFAULT_DATETIME_FORMAT);
        }
      }
      onFetchCardTenants({ ...payload, cardId }).then(res => {
        if (res) {
          this.setState({
            pagination: createPagination(res),
            dataSource: res.content,
          });
        }
      });
    }
  }

  // 一般通用的东西

  @Bind()
  handleRefSearchForm(refSearchForm) {
    this.refSearchForm = refSearchForm;
  }

  columns = [
    {
      title: intl.get('entity.tenant.code').d('租户编码'),
      dataIndex: 'tenantNum',
      width: 200,
      render: (tenantNum, record) => {
        if (record._status === 'create') {
          const form = record.$form;
          form.getFieldDecorator('tenantNum');
          const tenantChange = (_, tenant) => {
            form.setFieldsValue({
              tenantNum: tenant.tenantNum,
              tenantName: tenant.tenantName,
              creationDate: tenant.creationDate,
            });
          };
          return form.getFieldDecorator('tenantId', {
            rules: [
              {
                required: true,
                message: intl.get('hzero.common.validation.notNull', {
                  name: intl.get('entity.tenant.code').d('租户编码'),
                }),
              },
            ],
          })(<Lov code="HPFM.ASSIGN_TENANT" onChange={tenantChange} />);
        } else {
          return tenantNum;
        }
      },
    },
    {
      title: intl.get('entity.tenant.name').d('租户名称'),
      dataIndex: 'tenantName',
      render: (tenantName, record) => {
        if (record._status === 'create') {
          const form = record.$form;
          return (
            <React.Fragment>
              {form.getFieldValue('tenantName')}
              {form.getFieldDecorator('tenantName')(<div />)}
            </React.Fragment>
          );
        }
        return tenantName;
      },
    },
    {
      title: intl.get('hzero.common.date.register').d('注册时间'),
      dataIndex: 'creationDate',
      width: 180,
      render: (creationDate, record) => {
        if (record._status === 'create') {
          const form = record.$form;
          return (
            <React.Fragment>
              {dateTimeRender(form.getFieldValue('creationDate'))}
              {form.getFieldDecorator('creationDate')(<div />)}
            </React.Fragment>
          );
        } else {
          return dateTimeRender(creationDate);
        }
      },
    },
  ];

  scroll = {
    x: 770,
  };
}
