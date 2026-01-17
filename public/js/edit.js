$(function () {
  const edit = $('.edit');
  console.log(edit);
  edit.on('click', function () {
    const id = this.id;
    console.log(id);
    const currentRow = $(this).parents('tr');
    const inputs = currentRow.find('input, select');
    const actionBtn = currentRow.find('.actionBtn');
    console.log(actionBtn);

    inputs.removeAttr('disabled').addClass('change-cursor');
    if (inputs[0]) inputs[0].focus();
    let data = {};
    let change = false;
    inputs.on('change', function (e) {
      change = true;
      const dataAttr = e.target.getAttribute('name');
      const dataValue = e.target.value;

      // storing value and name dynamically
      data[dataAttr] =
        (typeof dataValue === 'string' && e.target.tagName === 'INPUT') ? dataValue.toUpperCase() : dataValue;
      // console.log(data);
      actionBtn.html(
        $(
          `<i class="btn btn-success w-75 fa fa-check-circle-o comfirmEdit"></i>`
        )
      );

      console.log($('.comfirmEdit'));
      // comfirm Key press
      $('.comfirmEdit').click(function () {
        $.ajax({
          type: 'Put',
          url: url + '/' + id,
          data: data,
          dataType: 'json',
          success: data => {
            console.log(data);
            location.reload();
          },
        });
        console.log('data received', data);
        //   location.reload();
      });
    });
  });
});
